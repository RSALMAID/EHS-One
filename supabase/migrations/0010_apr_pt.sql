-- EHS One · 0010 · APR e PT digitais
-- APR: etapas da tarefa com perigo, risco, nota 5×5 e controles; participantes assinam.
-- PT: permissão de trabalho por tipo (altura, quente, espaço confinado…), checklist,
-- liberação pela equipe, assinaturas e encerramento.
--
-- Pode rodar mais de uma vez: se já foi rodado neste banco, não faz nada.

do $migracao$
begin
  if to_regclass('public.aprs') is not null then
    raise notice 'Já rodado antes: nada a fazer.';
    return;
  end if;
  execute $sql$

create type public.apr_status as enum ('rascunho', 'aguardando_aprovacao', 'aprovada', 'reprovada', 'encerrada');
create type public.permit_kind as enum ('altura', 'espaco_confinado', 'quente', 'eletrica', 'escavacao', 'icamento', 'geral');
create type public.permit_status as enum ('solicitada', 'liberada', 'encerrada', 'cancelada');

create table public.aprs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  number           integer not null,
  title            text not null check (length(trim(title)) > 0),   -- tarefa
  sector_id        uuid references public.sectors(id) on delete set null,
  location         text,
  planned_on       date not null default current_date,
  description      text,
  status           public.apr_status not null default 'rascunho',
  created_by       uuid references auth.users(id) default auth.uid(),
  reviewed_by      uuid references auth.users(id),
  reviewed_at      timestamptz,
  review_notes     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, number)
);

create table public.apr_steps (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  apr_id           uuid not null references public.aprs(id) on delete cascade,
  position         integer not null default 0,
  step             text not null check (length(trim(step)) > 0),
  hazard           text not null check (length(trim(hazard)) > 0),
  harm             text,
  severity         smallint not null check (severity between 1 and 5),
  probability      smallint not null check (probability between 1 and 5),
  level            smallint generated always as (severity * probability) stored,
  controls         text not null check (length(trim(controls)) > 0),
  created_at       timestamptz not null default now()
);

create table public.work_permits (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  number           integer not null,
  kind             public.permit_kind not null,
  apr_id           uuid references public.aprs(id) on delete set null,
  sector_id        uuid references public.sectors(id) on delete set null,
  location         text,
  description      text not null check (length(trim(description)) > 0),
  valid_from       timestamptz not null,
  valid_until      timestamptz not null check (valid_until > valid_from),
  status           public.permit_status not null default 'solicitada',
  requested_by     uuid references auth.users(id) default auth.uid(),
  issued_by        uuid references auth.users(id),
  issued_at        timestamptz,
  closed_at        timestamptz,
  closing_notes    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, number)
);

create table public.permit_checks (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  permit_id        uuid not null references public.work_permits(id) on delete cascade,
  position         integer not null default 0,
  question         text not null,
  answer           text check (answer in ('sim', 'nao', 'na'))
);

-- Participantes e assinaturas (APR e PT na mesma tabela)
create table public.task_signatures (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  apr_id           uuid references public.aprs(id) on delete cascade,
  permit_id        uuid references public.work_permits(id) on delete cascade,
  worker_id        uuid not null references public.workers(id) on delete restrict,
  role             text not null default 'executante' check (role in ('executante', 'responsavel', 'emitente', 'vigia')),
  signed_at        timestamptz,
  signed_device    text,
  created_at       timestamptz not null default now(),
  check ((apr_id is null) <> (permit_id is null))
);
create unique index task_signatures_apr_idx on public.task_signatures(apr_id, worker_id) where apr_id is not null;
create unique index task_signatures_permit_idx on public.task_signatures(permit_id, worker_id, role) where permit_id is not null;

-- Numeração por empresa
create or replace function public.next_doc_number()
returns trigger language plpgsql as $$
begin
  if new.number is null then
    perform pg_advisory_xact_lock(hashtext(tg_table_name || new.organization_id::text));
    execute format('select coalesce(max(number), 0) + 1 from public.%I where organization_id = $1', tg_table_name)
      into new.number using new.organization_id;
  end if;
  return new;
end;
$$;
create trigger aprs_number before insert on public.aprs for each row execute function public.next_doc_number();
create trigger work_permits_number before insert on public.work_permits for each row execute function public.next_doc_number();

create or replace function public.task_same_org_check()
returns trigger language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid;
begin
  a := new.organization_id; b := a;
  if tg_table_name in ('aprs', 'work_permits') then
    if new.sector_id is not null then select organization_id into a from public.sectors where id = new.sector_id; end if;
    if tg_table_name = 'work_permits' then
      if new.apr_id is not null then select organization_id into b from public.aprs where id = new.apr_id; end if;
    end if;
  elsif tg_table_name = 'apr_steps' then
    select organization_id into a from public.aprs where id = new.apr_id;
  elsif tg_table_name = 'permit_checks' then
    select organization_id into a from public.work_permits where id = new.permit_id;
  elsif tg_table_name = 'task_signatures' then
    if new.apr_id is not null then select organization_id into a from public.aprs where id = new.apr_id;
    else select organization_id into a from public.work_permits where id = new.permit_id; end if;
    select organization_id into b from public.workers where id = new.worker_id;
  end if;
  if a is distinct from new.organization_id or b is distinct from new.organization_id then
    raise exception 'registro de outra empresa';
  end if;
  return new;
end;
$$;

-- Quem pode editar: a equipe sempre; o autor enquanto está em rascunho/reprovada (APR) ou solicitada (PT).
create or replace function public.can_edit_apr(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.aprs a where a.id = p and (
    public.has_role(a.organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[])
    or (a.created_by = auth.uid() and a.status in ('rascunho', 'reprovada'))));
$$;
create or replace function public.can_edit_permit(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.work_permits w where w.id = p and (
    public.has_role(w.organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[])
    or (w.requested_by = auth.uid() and w.status = 'solicitada')));
$$;
create or replace function public.can_see_task(p_apr uuid, p_permit uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.aprs a where a.id = p_apr
      and (public.is_staff(a.organization_id) or a.created_by = auth.uid()
           or exists (select 1 from public.task_signatures s where s.apr_id = a.id and public.owns_worker(s.worker_id)))
    union all
    select 1 from public.work_permits w where w.id = p_permit
      and (public.is_staff(w.organization_id) or w.requested_by = auth.uid()
           or exists (select 1 from public.task_signatures s where s.permit_id = w.id and public.owns_worker(s.worker_id))));
$$;

do $$
declare t text;
begin
  foreach t in array array['aprs', 'apr_steps', 'work_permits', 'permit_checks', 'task_signatures'] loop
    execute format(
      'create trigger %1$s_same_org before insert or update on public.%1$s
         for each row execute function public.task_same_org_check();
       create trigger %1$s_audit after insert or update or delete on public.%1$s
         for each row execute function public.audit_row();
       alter table public.%1$s enable row level security;
       grant select, insert, update, delete on public.%1$s to authenticated;', t);
  end loop;
end $$;
create trigger aprs_touch before update on public.aprs for each row execute function public.touch_updated_at();
create trigger work_permits_touch before update on public.work_permits for each row execute function public.touch_updated_at();

-- APR
-- Políticas de leitura sem consultar a própria tabela, para o INSERT … RETURNING enxergar a linha nova.
create policy aprs_select on public.aprs for select using (
  public.is_staff(organization_id) or created_by = auth.uid()
  or exists (select 1 from public.task_signatures s where s.apr_id = aprs.id and public.owns_worker(s.worker_id)));
create policy aprs_insert on public.aprs for insert
  with check (public.is_member(organization_id) and created_by = auth.uid() and status = 'rascunho');
create policy aprs_update on public.aprs for update
  using (public.can_edit_apr(id))
  with check (public.has_role(organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[])
              or (created_by = auth.uid() and status in ('rascunho', 'aguardando_aprovacao')));
create policy aprs_delete on public.aprs for delete using (public.can_edit_apr(id));
create policy apr_steps_select on public.apr_steps for select using (public.can_see_task(apr_id, null));
create policy apr_steps_write on public.apr_steps for all using (public.can_edit_apr(apr_id)) with check (public.can_edit_apr(apr_id));

-- PT
create policy work_permits_select on public.work_permits for select using (
  public.is_staff(organization_id) or requested_by = auth.uid()
  or exists (select 1 from public.task_signatures s where s.permit_id = work_permits.id and public.owns_worker(s.worker_id)));
create policy work_permits_insert on public.work_permits for insert
  with check (public.is_member(organization_id) and requested_by = auth.uid() and status = 'solicitada');
create policy work_permits_update on public.work_permits for update
  using (public.can_edit_permit(id))
  with check (public.has_role(organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[])
              or (requested_by = auth.uid() and status = 'solicitada'));
create policy work_permits_delete on public.work_permits for delete using (public.can_edit_permit(id));
create policy permit_checks_select on public.permit_checks for select using (public.can_see_task(null, permit_id));
create policy permit_checks_write on public.permit_checks for all using (public.can_edit_permit(permit_id)) with check (public.can_edit_permit(permit_id));

-- Assinaturas: quem edita a APR/PT inclui ou retira pessoas; cada um assina a própria linha pela função.
create policy task_signatures_select on public.task_signatures for select using (public.can_see_task(apr_id, permit_id));
create policy task_signatures_write on public.task_signatures for all
  using ((apr_id is not null and public.can_edit_apr(apr_id)) or (permit_id is not null and public.can_edit_permit(permit_id)))
  with check ((apr_id is not null and public.can_edit_apr(apr_id)) or (permit_id is not null and public.can_edit_permit(permit_id)));

create or replace function public.sign_task(p_signature uuid, p_device text default null)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.task_signatures
  set signed_at = now(), signed_device = left(p_device, 300)
  where id = p_signature and signed_at is null and public.owns_worker(worker_id);
  return found;
end;
$$;
revoke all on function public.sign_task(uuid, text) from public, anon;
grant execute on function public.sign_task(uuid, text) to authenticated;
grant execute on function public.can_edit_apr(uuid), public.can_edit_permit(uuid), public.can_see_task(uuid, uuid),
  public.task_same_org_check() to authenticated;

-- Nomes dos colegas ativos, para o trabalhador incluir participantes na APR/PT
-- (a ficha completa do trabalhador continua visível só para a equipe).
create or replace function public.worker_directory(p_org uuid)
returns table (id uuid, full_name text) language sql stable security definer set search_path = public as $$
  select w.id, w.full_name from public.workers w
  where w.organization_id = p_org and w.active and public.is_member(p_org)
  order by w.full_name;
$$;
revoke all on function public.worker_directory(uuid) from public, anon;
grant execute on function public.worker_directory(uuid) to authenticated;

  $sql$;
end $migracao$;

select '0010: pronto no banco' as resultado where to_regclass('public.aprs') is not null;
