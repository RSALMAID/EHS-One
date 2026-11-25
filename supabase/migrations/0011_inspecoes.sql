-- EHS One · 0011 · Inspeções e checklists
-- Modelos de checklist (Gestão); inspeções feitas pela equipe ou pelo trabalhador
-- no celular (Meu EHS), com foto por item; ao concluir, cada "não conforme" vira
-- ação num plano de ação próprio da inspeção.
--
-- Pode rodar mais de uma vez: se já foi rodado neste banco, não faz nada.

do $migracao$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'inspection_answers' and column_name = 'photo_path') then
    raise notice 'Já rodado antes: nada a fazer.';
    return;
  end if;
  execute $sql$

-- Se o script antigo de inspeções (0007_inspecoes.sql, de uma versão anterior) já foi
-- rodado neste banco, atualiza as tabelas dele em vez de dar erro, mantendo os dados.
do $$
declare t text;
begin
  if to_regclass('public.inspections') is not null and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inspections' and column_name = 'number') then
    alter table public.inspections add column number integer, add column location text;
    update public.inspections i set number = r.n
    from (select id, row_number() over (partition by organization_id order by created_at) as n
          from public.inspections) r
    where r.id = i.id;
    alter table public.inspections alter column number set not null;
    alter table public.inspections add constraint inspections_organization_id_number_key unique (organization_id, number);
    alter table public.inspection_answers add column photo_path text, add column photo_name text;
    foreach t in array array['checklist_templates', 'checklist_items', 'inspections', 'inspection_answers'] loop
      execute format('drop policy if exists %1$s_select on public.%1$s;
                      drop policy if exists %1$s_write on public.%1$s;
                      drop trigger if exists %1$s_same_org on public.%1$s;
                      drop trigger if exists %1$s_touch on public.%1$s;
                      drop trigger if exists %1$s_audit on public.%1$s;', t);
    end loop;
  end if;
end $$;

create table if not exists public.checklist_templates (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null check (length(trim(name)) > 0),
  description      text,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.checklist_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  template_id      uuid not null references public.checklist_templates(id) on delete cascade,
  position         integer not null default 0,
  question         text not null check (length(trim(question)) > 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists checklist_items_template_idx on public.checklist_items(template_id, position);

create table if not exists public.inspections (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  number           integer not null,
  template_id      uuid not null references public.checklist_templates(id) on delete restrict,
  sector_id        uuid references public.sectors(id) on delete set null,
  location         text,
  inspected_on     date not null default current_date,
  inspector        text,
  status           text not null default 'em_andamento' check (status in ('em_andamento', 'concluida')),
  notes            text,
  concluded_at     timestamptz,
  created_by       uuid references auth.users(id) default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, number)
);
create index if not exists inspections_org_idx on public.inspections(organization_id, inspected_on desc);
create trigger inspections_number before insert on public.inspections
  for each row execute function public.next_doc_number();

create table if not exists public.inspection_answers (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  inspection_id    uuid not null references public.inspections(id) on delete cascade,
  item_id          uuid references public.checklist_items(id) on delete set null,
  question         text not null,     -- cópia da pergunta: o histórico não muda se o modelo mudar
  position         integer not null default 0,
  answer           text check (answer in ('conforme', 'nao_conforme', 'na')),
  comment          text,
  photo_path       text,              -- bucket "evidencias": <org>/inspecoes/<inspeção>/<arquivo>
  photo_name       text,
  action_id        uuid references public.actions(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (inspection_id, item_id)
);

create or replace function public.inspection_same_org_check()
returns trigger language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid;
begin
  if tg_table_name = 'checklist_items' then
    select organization_id into a from public.checklist_templates where id = new.template_id;
    b := a;
  elsif tg_table_name = 'inspections' then
    select organization_id into a from public.checklist_templates where id = new.template_id;
    b := a;
    if new.sector_id is not null then
      select organization_id into b from public.sectors where id = new.sector_id;
    end if;
  elsif tg_table_name = 'inspection_answers' then
    select organization_id into a from public.inspections where id = new.inspection_id;
    b := a;
    if new.action_id is not null then
      select organization_id into b from public.actions where id = new.action_id;
    end if;
  end if;
  if a is distinct from new.organization_id or b is distinct from new.organization_id then
    raise exception 'registro de outra empresa';
  end if;
  return new;
end;
$$;

-- A equipe sempre edita; quem fez a inspeção edita enquanto ela está em andamento.
create or replace function public.can_edit_inspection(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.inspections i where i.id = p and (
    public.has_role(i.organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[])
    or (i.created_by = auth.uid() and i.status = 'em_andamento')));
$$;
create or replace function public.can_see_inspection(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.inspections i where i.id = p
    and (public.is_staff(i.organization_id) or i.created_by = auth.uid()));
$$;

do $$
declare t text;
begin
  foreach t in array array['checklist_items', 'inspections', 'inspection_answers'] loop
    execute format(
      'create trigger %1$s_same_org before insert or update on public.%1$s
         for each row execute function public.inspection_same_org_check();', t);
  end loop;
  foreach t in array array['checklist_templates', 'checklist_items', 'inspections', 'inspection_answers'] loop
    execute format(
      'create trigger %1$s_touch before update on public.%1$s
         for each row execute function public.touch_updated_at();
       create trigger %1$s_audit after insert or update or delete on public.%1$s
         for each row execute function public.audit_row();
       alter table public.%1$s enable row level security;
       grant select, insert, update, delete on public.%1$s to authenticated;', t);
  end loop;
  -- Modelos: todos da empresa leem (o trabalhador escolhe o modelo); só a equipe altera.
  foreach t in array array['checklist_templates', 'checklist_items'] loop
    execute format(
      'create policy %1$s_select on public.%1$s for select using (public.is_member(organization_id));
       create policy %1$s_write on public.%1$s for all
         using (public.has_role(organization_id, array[''proprietario'',''admin_ehs'',''gestor'']::public.member_role[]))
         with check (public.has_role(organization_id, array[''proprietario'',''admin_ehs'',''gestor'']::public.member_role[]));', t);
  end loop;
end $$;

create policy inspections_select on public.inspections for select
  using (public.is_staff(organization_id) or created_by = auth.uid());
create policy inspections_insert on public.inspections for insert
  with check (public.is_member(organization_id) and created_by = auth.uid() and status = 'em_andamento');
create policy inspections_update on public.inspections for update
  using (public.can_edit_inspection(id))
  with check (public.has_role(organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[])
              or (created_by = auth.uid() and status = 'em_andamento'));
create policy inspections_delete on public.inspections for delete using (public.can_edit_inspection(id));

create policy inspection_answers_select on public.inspection_answers for select
  using (public.can_see_inspection(inspection_id));
create policy inspection_answers_write on public.inspection_answers for all
  using (public.can_edit_inspection(inspection_id)) with check (public.can_edit_inspection(inspection_id));

-- Conclui a inspeção: exige todas as respostas e abre uma ação para cada "não conforme",
-- num plano de ação com o nome da inspeção. Funciona também para o trabalhador,
-- que não cria ações diretamente.
create or replace function public.conclude_inspection(p_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  insp record;
  faltam integer;
  plano uuid;
  nc record;
  aid uuid;
  n integer := 0;
begin
  if not public.can_edit_inspection(p_id) then
    raise exception 'Sem permissão para concluir esta inspeção.';
  end if;
  select i.*, t.name as modelo, s.name as setor into insp
  from public.inspections i
  join public.checklist_templates t on t.id = i.template_id
  left join public.sectors s on s.id = i.sector_id
  where i.id = p_id for update of i;
  if insp.status = 'concluida' then return 0; end if;
  select count(*) into faltam from public.inspection_answers where inspection_id = p_id and answer is null;
  if faltam > 0 then
    raise exception 'Responda todas as perguntas antes de concluir (faltam %).', faltam;
  end if;

  for nc in
    select id, question, comment from public.inspection_answers
    where inspection_id = p_id and answer = 'nao_conforme' and action_id is null order by position
  loop
    if plano is null then
      select id into plano from public.action_plans
      where organization_id = insp.organization_id and origin = 'inspecao' and origin_ref = p_id
        and status in ('aberto', 'em_andamento') limit 1;
      if plano is null then
        insert into public.action_plans (organization_id, title, origin, origin_ref, due_date)
        values (insp.organization_id,
                format('I-%s · %s%s · %s', lpad(insp.number::text, 4, '0'), insp.modelo,
                       coalesce(' (' || insp.setor || ')', ''), to_char(insp.inspected_on, 'DD/MM/YYYY')),
                'inspecao', p_id, current_date + 15)
        returning id into plano;
      end if;
    end if;
    insert into public.actions (organization_id, plan_id, origin, origin_ref, problem, action, due_date)
    values (insp.organization_id, plano, 'inspecao', p_id,
            nc.question || coalesce(' — ' || nc.comment, ''),
            'Corrigir a não conformidade apontada na inspeção', current_date + 15)
    returning id into aid;
    update public.inspection_answers set action_id = aid where id = nc.id;
    n := n + 1;
  end loop;

  update public.inspections set status = 'concluida', concluded_at = now() where id = p_id;
  return n;
end;
$$;

revoke all on function public.conclude_inspection(uuid) from public, anon;
grant execute on function public.conclude_inspection(uuid) to authenticated;
grant execute on function public.inspection_same_org_check(), public.can_edit_inspection(uuid),
  public.can_see_inspection(uuid) to authenticated;

  $sql$;
end $migracao$;

select '0011: pronto no banco' as resultado where exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'inspection_answers' and column_name = 'photo_path');
