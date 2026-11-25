-- EHS One · 0006 · Saúde ocupacional (PCMSO)
-- ASO por trabalhador, catálogo de exames, exames exigidos por cargo e exames realizados.
-- Dado de saúde é sensível (LGPD art. 11): exames realizados só são vistos por
-- proprietário, admin EHS e médico. O ASO (apto/inapto) também é visto pelo gestor.

create type public.aso_kind as enum (
  'admissional', 'periodico', 'retorno_trabalho', 'mudanca_risco', 'demissional'
);
create type public.aso_result as enum ('apto', 'apto_com_restricao', 'inapto');

create table public.exam_types (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  name               text not null check (length(trim(name)) > 0),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Exames exigidos por cargo (PCMSO), com periodicidade em meses
create table public.exam_job_roles (
  exam_type_id       uuid not null references public.exam_types(id) on delete cascade,
  job_role_id        uuid not null references public.job_roles(id) on delete cascade,
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  periodicity_months integer not null default 12 check (periodicity_months > 0),
  primary key (exam_type_id, job_role_id)
);

create table public.asos (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  worker_id        uuid not null references public.workers(id) on delete restrict,
  kind             public.aso_kind not null,
  issued_on        date not null,
  result           public.aso_result not null,
  restrictions     text,
  physician_name   text,
  physician_crm    text,
  next_due         date,                 -- próximo periódico
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index asos_worker_idx on public.asos(organization_id, worker_id, issued_on desc);

create table public.worker_exams (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  worker_id        uuid not null references public.workers(id) on delete restrict,
  exam_type_id     uuid not null references public.exam_types(id) on delete restrict,
  performed_on     date not null,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index worker_exams_worker_idx on public.worker_exams(organization_id, worker_id, performed_on desc);

create or replace function public.health_same_org_check()
returns trigger language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid;
begin
  if tg_table_name = 'exam_job_roles' then
    select organization_id into a from public.exam_types where id = new.exam_type_id;
    select organization_id into b from public.job_roles where id = new.job_role_id;
  elsif tg_table_name = 'asos' then
    select organization_id into a from public.workers where id = new.worker_id;
    b := a;
  elsif tg_table_name = 'worker_exams' then
    select organization_id into a from public.workers where id = new.worker_id;
    select organization_id into b from public.exam_types where id = new.exam_type_id;
  end if;
  if a is distinct from new.organization_id or b is distinct from new.organization_id then
    raise exception 'registro de outra empresa';
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['exam_job_roles', 'asos', 'worker_exams'] loop
    execute format(
      'create trigger %1$s_same_org before insert or update on public.%1$s
         for each row execute function public.health_same_org_check();', t);
  end loop;
  foreach t in array array['exam_types', 'asos', 'worker_exams'] loop
    execute format(
      'create trigger %1$s_touch before update on public.%1$s
         for each row execute function public.touch_updated_at();
       create trigger %1$s_audit after insert or update or delete on public.%1$s
         for each row execute function public.audit_row();', t);
  end loop;
  foreach t in array array['exam_types', 'exam_job_roles', 'asos', 'worker_exams'] loop
    execute format(
      'alter table public.%1$s enable row level security;
       grant select, insert, update, delete on public.%1$s to authenticated;', t);
  end loop;
end $$;

-- Catálogo e exigências por cargo: todos leem; admin, proprietário e médico escrevem.
create policy exam_types_select on public.exam_types for select using (public.is_member(organization_id));
create policy exam_types_write on public.exam_types for all
  using (public.has_role(organization_id, array['proprietario','admin_ehs','medico']::public.member_role[]))
  with check (public.has_role(organization_id, array['proprietario','admin_ehs','medico']::public.member_role[]));
create policy exam_job_roles_select on public.exam_job_roles for select using (public.is_member(organization_id));
create policy exam_job_roles_write on public.exam_job_roles for all
  using (public.has_role(organization_id, array['proprietario','admin_ehs','medico']::public.member_role[]))
  with check (public.has_role(organization_id, array['proprietario','admin_ehs','medico']::public.member_role[]));

-- ASO: gestor também lê (precisa saber apto/inapto); escrevem proprietário, admin e médico.
create policy asos_select on public.asos for select
  using (public.has_role(organization_id, array['proprietario','admin_ehs','gestor','medico']::public.member_role[]));
create policy asos_write on public.asos for all
  using (public.has_role(organization_id, array['proprietario','admin_ehs','medico']::public.member_role[]))
  with check (public.has_role(organization_id, array['proprietario','admin_ehs','medico']::public.member_role[]));

-- Exames realizados: só proprietário, admin e médico.
create policy worker_exams_all on public.worker_exams for all
  using (public.has_role(organization_id, array['proprietario','admin_ehs','medico']::public.member_role[]))
  with check (public.has_role(organization_id, array['proprietario','admin_ehs','medico']::public.member_role[]));

grant execute on function public.health_same_org_check() to authenticated;
