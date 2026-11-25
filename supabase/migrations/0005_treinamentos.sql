-- EHS One · 0005 · Treinamentos
-- Catálogo (com NR, carga horária e validade), matriz cargo × treinamento,
-- turmas e participantes. Vencimento = data da turma + validade em meses.

create table public.trainings (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null check (length(trim(name)) > 0),
  norm_reference   text,                -- ex.: NR-35, NR-10, NR-12
  workload_hours   numeric(5,1) check (workload_hours is null or workload_hours > 0),
  validity_months  integer check (validity_months is null or validity_months > 0),  -- vazio = não vence
  syllabus         text,                -- conteúdo programático
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index trainings_org_idx on public.trainings(organization_id);

-- Matriz de treinamentos: cargo exige treinamento
create table public.training_job_roles (
  training_id     uuid not null references public.trainings(id) on delete cascade,
  job_role_id     uuid not null references public.job_roles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  primary key (training_id, job_role_id)
);

create table public.training_sessions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  training_id      uuid not null references public.trainings(id) on delete restrict,
  held_on          date not null,
  instructor       text,
  location         text,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index training_sessions_org_idx on public.training_sessions(organization_id, held_on desc);

create table public.training_attendances (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  session_id       uuid not null references public.training_sessions(id) on delete cascade,
  worker_id        uuid not null references public.workers(id) on delete restrict,  -- histórico é guardado
  approved         boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (session_id, worker_id)
);
create index training_attendances_worker_idx on public.training_attendances(organization_id, worker_id);

create or replace function public.training_same_org_check()
returns trigger language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid;
begin
  if tg_table_name = 'training_job_roles' then
    select organization_id into a from public.trainings where id = new.training_id;
    select organization_id into b from public.job_roles where id = new.job_role_id;
  elsif tg_table_name = 'training_sessions' then
    select organization_id into a from public.trainings where id = new.training_id;
    b := a;
  elsif tg_table_name = 'training_attendances' then
    select organization_id into a from public.training_sessions where id = new.session_id;
    select organization_id into b from public.workers where id = new.worker_id;
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
  foreach t in array array['training_job_roles', 'training_sessions', 'training_attendances'] loop
    execute format(
      'create trigger %1$s_same_org before insert or update on public.%1$s
         for each row execute function public.training_same_org_check();', t);
  end loop;
  foreach t in array array['trainings', 'training_sessions', 'training_attendances'] loop
    execute format(
      'create trigger %1$s_touch before update on public.%1$s
         for each row execute function public.touch_updated_at();
       create trigger %1$s_audit after insert or update or delete on public.%1$s
         for each row execute function public.audit_row();', t);
  end loop;
  foreach t in array array['trainings', 'training_job_roles', 'training_sessions', 'training_attendances'] loop
    execute format(
      'alter table public.%1$s enable row level security;
       create policy %1$s_select on public.%1$s for select using (public.is_member(organization_id));
       create policy %1$s_write on public.%1$s for all
         using (public.has_role(organization_id, array[''proprietario'',''admin_ehs'',''gestor'']::public.member_role[]))
         with check (public.has_role(organization_id, array[''proprietario'',''admin_ehs'',''gestor'']::public.member_role[]));
       grant select, insert, update, delete on public.%1$s to authenticated;', t);
  end loop;
end $$;

grant execute on function public.training_same_org_check() to authenticated;
