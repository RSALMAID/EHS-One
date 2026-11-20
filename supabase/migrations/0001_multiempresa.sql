-- EHS One · 0001 · Base multiempresa
-- Cada empresa cliente é uma "organização". Todo registro de negócio carrega
-- organization_id e só é visível para membros daquela organização (RLS).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Perfis de acesso (ver "Navegação do app e perfis" no mapa de telas)
-- ---------------------------------------------------------------------------
create type public.member_role as enum (
  'proprietario',
  'admin_ehs',
  'gestor',
  'trabalhador',
  'medico',
  'consultor'
);

-- ---------------------------------------------------------------------------
-- Organizações e membros
-- ---------------------------------------------------------------------------
create table public.organizations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (length(trim(name)) > 0),
  cnpj            text,
  segment         text,
  employee_count  integer check (employee_count is null or employee_count >= 0),
  plan            text not null default 'teste'
                  check (plan in ('teste', 'essencial', 'profissional', 'empresa', 'consultor')),
  trial_ends_at   timestamptz not null default (now() + interval '14 days'),
  stripe_customer_id text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            public.member_role not null,
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index memberships_user_idx on public.memberships(user_id);

-- Funções auxiliares usadas pelas políticas. SECURITY DEFINER evita recursão
-- de RLS ao consultar memberships de dentro de uma política.
create or replace function public.is_member(org uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_role(org uuid, roles public.member_role[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = auth.uid() and m.role = any(roles)
  );
$$;

-- Cria a organização e torna quem chamou proprietário, numa transação só.
create or replace function public.create_organization(
  p_name text,
  p_cnpj text default null,
  p_segment text default null,
  p_employee_count integer default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  insert into public.organizations (name, cnpj, segment, employee_count)
  values (p_name, nullif(trim(p_cnpj), ''), nullif(trim(p_segment), ''), p_employee_count)
  returning id into new_id;
  insert into public.memberships (organization_id, user_id, role)
  values (new_id, auth.uid(), 'proprietario');
  return new_id;
end;
$$;
revoke all on function public.create_organization(text, text, text, integer) from public, anon;
grant execute on function public.create_organization(text, text, text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Cadastros: unidades, setores, cargos, trabalhadores
-- ---------------------------------------------------------------------------
create table public.units (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  address         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.sectors (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  unit_id         uuid not null references public.units(id) on delete cascade,
  name            text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.job_roles (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  description     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.workers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name       text not null check (length(trim(full_name)) > 0),
  cpf             text,
  email           text,
  sector_id       uuid references public.sectors(id) on delete set null,
  job_role_id     uuid references public.job_roles(id) on delete set null,
  user_id         uuid references auth.users(id) on delete set null,
  is_contractor   boolean not null default false,
  hired_at        date,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index workers_org_idx on public.workers(organization_id);

-- ---------------------------------------------------------------------------
-- Central de Ações: toda providência nasce aqui, venha de onde vier
-- ---------------------------------------------------------------------------
create type public.action_origin as enum (
  'pgr', 'inspecao', 'ocorrencia', 'auditoria', 'ergonomia', 'dds',
  'treinamento', 'documento', 'observacao', 'requisito_legal', 'vencimento', 'outro'
);
create type public.action_status as enum (
  'aberta', 'em_andamento', 'aguardando_validacao', 'concluida', 'cancelada'
);

create table public.actions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  number          integer not null,
  origin          public.action_origin not null default 'outro',
  origin_ref      uuid,
  problem         text not null,
  action          text not null,
  responsible_id  uuid references public.workers(id) on delete set null,
  due_date        date,
  status          public.action_status not null default 'aberta',
  evidence_required text,
  closed_at       timestamptz,
  created_by      uuid references auth.users(id) default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, number)
);
create index actions_org_status_idx on public.actions(organization_id, status, due_date);

-- Numeração sequencial por empresa (#0001, #0002…)
create or replace function public.next_action_number()
returns trigger language plpgsql as $$
begin
  if new.number is null then
    perform pg_advisory_xact_lock(hashtext(new.organization_id::text));
    select coalesce(max(number), 0) + 1 into new.number
    from public.actions where organization_id = new.organization_id;
  end if;
  return new;
end;
$$;
create trigger actions_number before insert on public.actions
for each row execute function public.next_action_number();

-- ---------------------------------------------------------------------------
-- Trilha de auditoria (LGPD): quem, quando, antes, depois
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id              bigint generated always as identity primary key,
  organization_id uuid not null,
  table_name      text not null,
  record_id       uuid not null,
  operation       text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  changed_by      uuid default auth.uid(),
  changed_at      timestamptz not null default now(),
  old_data        jsonb,
  new_data        jsonb,
  justification   text
);
create index audit_log_org_idx on public.audit_log(organization_id, changed_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.audit_row()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  rec jsonb;
begin
  rec := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.audit_log (organization_id, table_name, record_id, operation, old_data, new_data, justification)
  values (
    (rec->>'organization_id')::uuid,
    tg_table_name,
    (rec->>'id')::uuid,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    nullif(current_setting('ehs.justification', true), '')
  );
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['units', 'sectors', 'job_roles', 'workers', 'actions'] loop
    execute format(
      'create trigger %1$s_touch before update on public.%1$s
         for each row execute function public.touch_updated_at();
       create trigger %1$s_audit after insert or update or delete on public.%1$s
         for each row execute function public.audit_row();', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.memberships  enable row level security;
alter table public.units        enable row level security;
alter table public.sectors      enable row level security;
alter table public.job_roles    enable row level security;
alter table public.workers      enable row level security;
alter table public.actions      enable row level security;
alter table public.audit_log    enable row level security;

create policy org_select on public.organizations for select using (public.is_member(id));
create policy org_update on public.organizations for update
  using (public.has_role(id, array['proprietario']::public.member_role[]));
-- Inserção de organizações só pela função create_organization.

create policy members_select on public.memberships for select using (public.is_member(organization_id));
create policy members_manage on public.memberships for all
  using (public.has_role(organization_id, array['proprietario']::public.member_role[]))
  with check (public.has_role(organization_id, array['proprietario']::public.member_role[]));

-- Cadastros e ações: membros leem; proprietário, admin EHS e gestor escrevem.
do $$
declare t text;
begin
  foreach t in array array['units', 'sectors', 'job_roles', 'workers', 'actions'] loop
    execute format(
      'create policy %1$s_select on public.%1$s for select using (public.is_member(organization_id));
       create policy %1$s_write on public.%1$s for all
         using (public.has_role(organization_id, array[''proprietario'',''admin_ehs'',''gestor'']::public.member_role[]))
         with check (public.has_role(organization_id, array[''proprietario'',''admin_ehs'',''gestor'']::public.member_role[]));', t);
  end loop;
end $$;

-- Auditoria: só leitura, para proprietário e admin EHS. Escrita apenas pelo gatilho.
create policy audit_select on public.audit_log for select
  using (public.has_role(organization_id, array['proprietario','admin_ehs']::public.member_role[]));
