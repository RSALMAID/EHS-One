-- EHS One · 0003 · GRO/PGR
-- Unidade → Setor → Processo → Atividade → Perigo/Risco → Avaliação → Controles → Ações
-- Matriz 5×5: nível = severidade × probabilidade.

create table public.processes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sector_id       uuid not null references public.sectors(id) on delete cascade,
  name            text not null check (length(trim(name)) > 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.activities (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  process_id      uuid not null references public.processes(id) on delete cascade,
  name            text not null check (length(trim(name)) > 0),
  description     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create type public.risk_type as enum (
  'fisico', 'quimico', 'biologico', 'ergonomico', 'acidente', 'psicossocial'
);

create table public.risks (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  activity_id       uuid not null references public.activities(id) on delete cascade,
  risk_type         public.risk_type not null,
  hazard            text not null check (length(trim(hazard)) > 0),   -- perigo / fator de risco
  source            text,                                              -- fonte ou circunstância
  possible_harm     text,                                              -- possíveis lesões ou agravos
  exposed_count     integer check (exposed_count is null or exposed_count >= 0),
  severity          smallint not null check (severity between 1 and 5),
  probability       smallint not null check (probability between 1 and 5),
  level             smallint generated always as (severity * probability) stored,
  existing_controls text,
  residual_severity    smallint check (residual_severity between 1 and 5),
  residual_probability smallint check (residual_probability between 1 and 5),
  validated_by      uuid references auth.users(id),
  validated_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index risks_org_idx on public.risks(organization_id, level desc);

-- Cargos expostos a cada risco (grupo de exposição)
create table public.risk_job_roles (
  risk_id         uuid not null references public.risks(id) on delete cascade,
  job_role_id     uuid not null references public.job_roles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  primary key (risk_id, job_role_id)
);

-- Consistência: pai e filho na mesma empresa
create or replace function public.same_org_check()
returns trigger language plpgsql security definer set search_path = public as $$
declare parent_org uuid;
begin
  if tg_table_name = 'processes' then
    select organization_id into parent_org from public.sectors where id = new.sector_id;
  elsif tg_table_name = 'activities' then
    select organization_id into parent_org from public.processes where id = new.process_id;
  elsif tg_table_name = 'risks' then
    select organization_id into parent_org from public.activities where id = new.activity_id;
  elsif tg_table_name = 'risk_job_roles' then
    select organization_id into parent_org from public.job_roles where id = new.job_role_id;
    if parent_org = new.organization_id then
      select organization_id into parent_org from public.risks where id = new.risk_id;
    end if;
  end if;
  if parent_org is distinct from new.organization_id then
    raise exception 'registro de outra empresa';
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['processes', 'activities', 'risks', 'risk_job_roles'] loop
    execute format(
      'create trigger %1$s_same_org before insert or update on public.%1$s
         for each row execute function public.same_org_check();', t);
  end loop;
  foreach t in array array['processes', 'activities', 'risks'] loop
    execute format(
      'create trigger %1$s_touch before update on public.%1$s
         for each row execute function public.touch_updated_at();
       create trigger %1$s_audit after insert or update or delete on public.%1$s
         for each row execute function public.audit_row();', t);
  end loop;
  foreach t in array array['processes', 'activities', 'risks', 'risk_job_roles'] loop
    execute format(
      'alter table public.%1$s enable row level security;
       create policy %1$s_select on public.%1$s for select using (public.is_member(organization_id));
       create policy %1$s_write on public.%1$s for all
         using (public.has_role(organization_id, array[''proprietario'',''admin_ehs'',''gestor'']::public.member_role[]))
         with check (public.has_role(organization_id, array[''proprietario'',''admin_ehs'',''gestor'']::public.member_role[]));
       grant select, insert, update, delete on public.%1$s to authenticated;', t);
  end loop;
end $$;
