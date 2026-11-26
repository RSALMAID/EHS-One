-- EHS One · 0015 · CIPA e SESMT
-- CIPA (NR-05): gestões com membros (cargo, representação, treinamento, estabilidade),
-- reuniões com presença e ata; deliberações viram ações num plano da reunião.
-- SESMT (NR-04): profissionais com registro e carga horária.
--
-- Pode rodar mais de uma vez: se já foi rodado neste banco, não faz nada.

do $migracao$
begin
  if to_regclass('public.cipa_mandates') is not null then
    raise notice 'Já rodado antes: nada a fazer.';
    return;
  end if;
  execute $sql$

alter type public.action_origin add value if not exists 'cipa';

create table public.cipa_mandates (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null check (length(trim(name)) > 0),   -- ex.: Gestão 2026/2027
  unit_id          uuid references public.units(id) on delete set null,
  starts_on        date not null,
  ends_on          date not null check (ends_on > starts_on),
  election_on      date,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.cipa_members (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  mandate_id       uuid not null references public.cipa_mandates(id) on delete cascade,
  worker_id        uuid not null references public.workers(id) on delete restrict,
  role             text not null default 'titular'
                   check (role in ('presidente', 'vice_presidente', 'secretario', 'titular', 'suplente')),
  representation   text not null check (representation in ('empregador', 'empregados')),
  trained_on       date,             -- treinamento da CIPA (NR-05)
  left_on          date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (mandate_id, worker_id)
);

create table public.cipa_meetings (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  mandate_id       uuid not null references public.cipa_mandates(id) on delete cascade,
  held_on          date not null,
  kind             text not null default 'ordinaria' check (kind in ('ordinaria', 'extraordinaria')),
  agenda           text,
  minutes          text,             -- ata
  plan_id          uuid references public.action_plans(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.cipa_attendances (
  meeting_id       uuid not null references public.cipa_meetings(id) on delete cascade,
  member_id        uuid not null references public.cipa_members(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  primary key (meeting_id, member_id)
);

create table public.sesmt_members (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  worker_id        uuid references public.workers(id) on delete set null,
  name             text not null check (length(trim(name)) > 0),
  role             text not null check (role in ('engenheiro_seguranca', 'tecnico_seguranca', 'medico_trabalho',
                                                 'enfermeiro_trabalho', 'auxiliar_enfermagem')),
  registration     text,             -- CREA, CRM, COREN, registro no MTE
  hours_per_week   numeric check (hours_per_week is null or hours_per_week > 0),
  starts_on        date,
  ends_on          date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create or replace function public.cipa_same_org_check()
returns trigger language plpgsql security definer set search_path = public as $f$
declare a uuid; b uuid;
begin
  a := new.organization_id; b := a;
  if tg_table_name = 'cipa_mandates' then
    if new.unit_id is not null then select organization_id into a from public.units where id = new.unit_id; end if;
  elsif tg_table_name = 'cipa_members' then
    select organization_id into a from public.cipa_mandates where id = new.mandate_id;
    select organization_id into b from public.workers where id = new.worker_id;
  elsif tg_table_name = 'cipa_meetings' then
    select organization_id into a from public.cipa_mandates where id = new.mandate_id;
    if new.plan_id is not null then select organization_id into b from public.action_plans where id = new.plan_id; end if;
  elsif tg_table_name = 'cipa_attendances' then
    select organization_id into a from public.cipa_meetings where id = new.meeting_id;
    select organization_id into b from public.cipa_members where id = new.member_id;
  elsif tg_table_name = 'sesmt_members' then
    if new.worker_id is not null then select organization_id into a from public.workers where id = new.worker_id; end if;
  end if;
  if a is distinct from new.organization_id or b is distinct from new.organization_id then
    raise exception 'registro de outra empresa';
  end if;
  return new;
end;
$f$;

do $d$
declare t text;
begin
  foreach t in array array['cipa_mandates', 'cipa_members', 'cipa_meetings', 'cipa_attendances', 'sesmt_members'] loop
    execute format(
      'create trigger %1$s_same_org before insert or update on public.%1$s
         for each row execute function public.cipa_same_org_check();
       alter table public.%1$s enable row level security;
       create policy %1$s_select on public.%1$s for select using (public.is_member(organization_id));
       create policy %1$s_write on public.%1$s for all
         using (public.has_role(organization_id, array[''proprietario'',''admin_ehs'',''gestor'']::public.member_role[]))
         with check (public.has_role(organization_id, array[''proprietario'',''admin_ehs'',''gestor'']::public.member_role[]));
       grant select, insert, update, delete on public.%1$s to authenticated;', t);
  end loop;
  foreach t in array array['cipa_mandates', 'cipa_members', 'cipa_meetings', 'sesmt_members'] loop
    execute format(
      'create trigger %1$s_touch before update on public.%1$s
         for each row execute function public.touch_updated_at();
       create trigger %1$s_audit after insert or update or delete on public.%1$s
         for each row execute function public.audit_row();', t);
  end loop;
end $d$;

grant execute on function public.cipa_same_org_check() to authenticated;

  $sql$;
end $migracao$;

select '0015: pronto no banco' as resultado where to_regclass('public.cipa_mandates') is not null;
