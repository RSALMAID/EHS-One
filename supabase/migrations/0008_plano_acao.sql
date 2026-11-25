-- EHS One · 0008 · Plano de ação
-- Um plano reúne várias ações. Cada ação tem responsável, prazo, evidências
-- (texto e arquivos) e verificação de eficácia. Ações criadas pelos módulos
-- sem plano entram sozinhas num plano da mesma origem.

create type public.plan_status as enum ('aberto', 'em_andamento', 'concluido', 'cancelado');

create table public.action_plans (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  number          integer not null,
  title           text not null check (length(trim(title)) > 0),
  objective       text,
  origin          public.action_origin not null default 'outro',
  origin_ref      uuid,
  owner_id        uuid references public.workers(id) on delete set null,
  due_date        date,
  status          public.plan_status not null default 'aberto',
  created_by      uuid references auth.users(id) default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, number)
);
create index action_plans_org_idx on public.action_plans(organization_id, status);

create or replace function public.next_plan_number()
returns trigger language plpgsql as $$
begin
  if new.number is null then
    perform pg_advisory_xact_lock(hashtext('plan' || new.organization_id::text));
    select coalesce(max(number), 0) + 1 into new.number
    from public.action_plans where organization_id = new.organization_id;
  end if;
  return new;
end;
$$;
create trigger action_plans_number before insert on public.action_plans
  for each row execute function public.next_plan_number();

alter table public.actions
  add column plan_id uuid references public.action_plans(id) on delete cascade,
  add column efficacy_result text check (efficacy_result in ('eficaz', 'nao_eficaz')),
  add column efficacy_notes text,
  add column efficacy_checked_at timestamptz,
  add column efficacy_checked_by uuid references auth.users(id);
create index actions_plan_idx on public.actions(plan_id);

-- Título padrão do plano automático, por origem
create or replace function public.plan_title_for(o public.action_origin)
returns text language sql immutable as $$
  select case o
    when 'pgr' then 'Ações do PGR'
    when 'inspecao' then 'Ações de inspeção'
    when 'ocorrencia' then 'Ações de ocorrência'
    when 'auditoria' then 'Ações de auditoria'
    when 'treinamento' then 'Treinamentos pendentes'
    when 'vencimento' then 'Vencimentos (EPI, CA e saúde)'
    when 'requisito_legal' then 'Requisitos legais'
    else 'Ações avulsas'
  end;
$$;

-- Ação sem plano: entra no plano aberto da mesma origem (e da mesma inspeção,
-- ocorrência ou auditoria); se não houver, o plano é criado.
create or replace function public.attach_action_plan()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  por_ref boolean := new.origin in ('inspecao', 'ocorrencia', 'auditoria');
  pid uuid;
begin
  if new.plan_id is not null then return new; end if;
  select id into pid from public.action_plans
  where organization_id = new.organization_id and origin = new.origin
    and status in ('aberto', 'em_andamento')
    and (not por_ref or origin_ref is not distinct from new.origin_ref)
  order by created_at limit 1;
  if pid is null then
    insert into public.action_plans (organization_id, title, origin, origin_ref)
    values (new.organization_id, public.plan_title_for(new.origin), new.origin,
            case when por_ref then new.origin_ref end)
    returning id into pid;
  end if;
  new.plan_id := pid;
  return new;
end;
$$;
create trigger actions_attach_plan before insert on public.actions
  for each row execute function public.attach_action_plan();

-- Ações que já existem vão para planos automáticos
insert into public.action_plans (organization_id, title, origin)
select distinct organization_id, public.plan_title_for(origin), origin
from public.actions where plan_id is null;
update public.actions a set plan_id = p.id
from public.action_plans p
where a.plan_id is null and p.organization_id = a.organization_id and p.origin = a.origin;
alter table public.actions alter column plan_id set not null;

-- Evidências da ação: texto e/ou arquivo no Storage (bucket "evidencias")
create table public.action_evidences (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  action_id       uuid not null references public.actions(id) on delete cascade,
  note            text,
  file_path       text,           -- <organization_id>/<action_id>/<arquivo>
  file_name       text,
  created_by      uuid references auth.users(id) default auth.uid(),
  created_at      timestamptz not null default now(),
  check (note is not null or file_path is not null)
);
create index action_evidences_action_idx on public.action_evidences(action_id);

create or replace function public.action_same_org_check()
returns trigger language plpgsql security definer set search_path = public as $$
declare a uuid;
begin
  if tg_table_name = 'actions' then
    select organization_id into a from public.action_plans where id = new.plan_id;
  elsif tg_table_name = 'action_evidences' then
    select organization_id into a from public.actions where id = new.action_id;
  elsif tg_table_name = 'action_plans' then
    a := new.organization_id;
    if new.owner_id is not null then
      select organization_id into a from public.workers where id = new.owner_id;
    end if;
  end if;
  if a is distinct from new.organization_id then
    raise exception 'registro de outra empresa';
  end if;
  return new;
end;
$$;
-- roda depois de attach_action_plan (ordem alfabética dos gatilhos "before")
create trigger actions_same_org before insert or update on public.actions
  for each row execute function public.action_same_org_check();
create trigger action_evidences_same_org before insert or update on public.action_evidences
  for each row execute function public.action_same_org_check();
create trigger action_plans_same_org before insert or update on public.action_plans
  for each row execute function public.action_same_org_check();

create trigger action_plans_touch before update on public.action_plans
  for each row execute function public.touch_updated_at();
create trigger action_plans_audit after insert or update or delete on public.action_plans
  for each row execute function public.audit_row();
create trigger action_evidences_audit after insert or update or delete on public.action_evidences
  for each row execute function public.audit_row();

alter table public.action_plans enable row level security;
alter table public.action_evidences enable row level security;
create policy action_plans_select on public.action_plans for select using (public.is_staff(organization_id));
create policy action_plans_write on public.action_plans for all
  using (public.has_role(organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[]))
  with check (public.has_role(organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[]));
create policy action_evidences_select on public.action_evidences for select
  using (public.is_staff(organization_id)
         or exists (select 1 from public.actions x where x.id = action_id and public.owns_worker(x.responsible_id)));
create policy action_evidences_insert on public.action_evidences for insert
  with check (public.has_role(organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[])
         or exists (select 1 from public.actions x where x.id = action_id and public.owns_worker(x.responsible_id)));
create policy action_evidences_delete on public.action_evidences for delete
  using (public.has_role(organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[]));
grant select, insert, update, delete on public.action_plans, public.action_evidences to authenticated;

-- O responsável (inclusive o trabalhador no Meu EHS) avisa que concluiu: vai para validação.
create or replace function public.submit_action(p_id uuid, p_note text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare a public.actions;
begin
  select * into a from public.actions where id = p_id;
  if a.id is null then return false; end if;
  if not (public.owns_worker(a.responsible_id)
          or public.has_role(a.organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[])) then
    return false;
  end if;
  if nullif(trim(p_note), '') is not null then
    insert into public.action_evidences (organization_id, action_id, note) values (a.organization_id, a.id, trim(p_note));
  end if;
  update public.actions set status = 'aguardando_validacao' where id = a.id and status in ('aberta', 'em_andamento');
  return true;
end;
$$;
revoke all on function public.submit_action(uuid, text) from public, anon;
grant execute on function public.submit_action(uuid, text) to authenticated;
grant execute on function public.attach_action_plan(), public.action_same_org_check(), public.plan_title_for(public.action_origin) to authenticated;

-- Storage: bucket privado; cada empresa só lê e grava na própria pasta.
insert into storage.buckets (id, name, public) values ('evidencias', 'evidencias', false)
on conflict (id) do nothing;
create policy evidencias_read on storage.objects for select to authenticated
  using (bucket_id = 'evidencias' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy evidencias_write on storage.objects for insert to authenticated
  with check (bucket_id = 'evidencias' and public.is_member(((storage.foldername(name))[1])::uuid));
