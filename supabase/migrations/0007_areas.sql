-- EHS One · 0007 · Áreas (Gestão e Meu EHS), convite do trabalhador e módulos por plano
-- 1) Módulos liberados por plano (com liberação extra por empresa)
-- 2) Convite por e-mail que liga a conta à ficha do trabalhador
-- 3) Dados pessoais: o trabalhador vê só o que é dele
-- 4) Confirmação de recebimento de EPI pelo próprio trabalhador

-- ---------------------------------------------------------------------------
-- 1. Módulos e planos
-- ---------------------------------------------------------------------------
create table public.modules (
  code   text primary key,
  name   text not null,
  sort   integer not null default 0
);
insert into public.modules (code, name, sort) values
  ('cadastros', 'Cadastros', 10),
  ('pgr', 'GRO/PGR e mapa de riscos', 20),
  ('acoes', 'Plano de ação', 30),
  ('epi', 'EPI', 40),
  ('treinamentos', 'Treinamentos', 50),
  ('saude', 'PCMSO e ASO', 60),
  ('eventos', 'Eventos e desvios', 70),
  ('analise_causas', 'Análise de causas', 80),
  ('inspecoes', 'Inspeções e checklists', 90),
  ('apr_pt', 'APR e PT digitais', 100),
  ('dds', 'DDS e divulgações', 110),
  ('documentos', 'Documentos', 120),
  ('autorizacoes', 'Capacitações e autorizações', 130),
  ('cipa_sesmt', 'CIPA e SESMT', 140),
  ('requisitos_legais', 'Requisitos legais', 150),
  ('higiene', 'Higiene ocupacional', 160),
  ('meio_ambiente', 'Meio ambiente', 170),
  ('iso', 'ISO 45001 e 14001', 180),
  ('hht', 'HHT e indicadores', 190),
  ('dashboard', 'Dashboard', 200);

create table public.plan_modules (
  plan        text not null,
  module_code text not null references public.modules(code) on delete cascade,
  primary key (plan, module_code)
);
-- Básico = 'essencial'; Completo = 'empresa'. Teste e consultor liberam tudo.
insert into public.plan_modules (plan, module_code)
select p, m.code from public.modules m,
  unnest(array['teste', 'empresa', 'consultor']) as p;
insert into public.plan_modules (plan, module_code)
select 'essencial', code from public.modules
where code in ('cadastros','pgr','acoes','epi','treinamentos','saude','eventos','inspecoes','dds','documentos','hht');
insert into public.plan_modules (plan, module_code)
select 'profissional', code from public.modules
where code not in ('higiene','meio_ambiente','iso');

create table public.organization_modules (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_code     text not null references public.modules(code) on delete cascade,
  enabled         boolean not null default true,   -- false tira um módulo do plano
  primary key (organization_id, module_code)
);

create or replace function public.enabled_modules(org uuid)
returns setof text
language sql stable security definer set search_path = public
as $$
  select pm.module_code
  from public.organizations o
  join public.plan_modules pm on pm.plan = o.plan
  where o.id = org and public.is_member(org)
    and not exists (select 1 from public.organization_modules x
                    where x.organization_id = org and x.module_code = pm.module_code and not x.enabled)
  union
  select x.module_code from public.organization_modules x
  where x.organization_id = org and x.enabled and public.is_member(org);
$$;

create or replace function public.has_module(org uuid, code text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select code in (select public.enabled_modules(org));
$$;

alter table public.modules enable row level security;
alter table public.plan_modules enable row level security;
alter table public.organization_modules enable row level security;
create policy modules_read on public.modules for select using (true);
create policy plan_modules_read on public.plan_modules for select using (true);
create policy org_modules_read on public.organization_modules for select using (public.is_member(organization_id));
-- organization_modules só é alterado pela equipe EHS One (service role), não pelo cliente.
grant select on public.modules, public.plan_modules, public.organization_modules to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Convites
-- ---------------------------------------------------------------------------
create table public.invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email           text not null check (position('@' in email) > 1),
  role            public.member_role not null default 'trabalhador',
  worker_id       uuid references public.workers(id) on delete cascade,
  invited_by      uuid references auth.users(id) default auth.uid(),
  accepted_at     timestamptz,
  accepted_by     uuid references auth.users(id),
  created_at      timestamptz not null default now()
);
create unique index invitations_pending_idx on public.invitations(organization_id, lower(email))
  where accepted_at is null;

alter table public.invitations enable row level security;
create policy invitations_select on public.invitations for select
  using (public.has_role(organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[]));
-- Proprietário convida qualquer perfil; admin EHS e gestor não convidam proprietário nem admin.
create policy invitations_write on public.invitations for all
  using (public.has_role(organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[]))
  with check (
    public.has_role(organization_id, array['proprietario']::public.member_role[])
    or (public.has_role(organization_id, array['admin_ehs','gestor']::public.member_role[])
        and role in ('trabalhador','gestor','medico'))
  );
grant select, insert, update, delete on public.invitations to authenticated;

-- Aceita os convites pendentes do e-mail (já confirmado) de quem está logado.
create or replace function public.accept_invitations()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  meu_email text;
  inv record;
  n integer := 0;
begin
  if auth.uid() is null then return 0; end if;
  select email into meu_email from auth.users
  where id = auth.uid() and email_confirmed_at is not null;
  if meu_email is null then return 0; end if;
  for inv in
    select * from public.invitations
    where lower(email) = lower(meu_email) and accepted_at is null
  loop
    insert into public.memberships (organization_id, user_id, role)
    values (inv.organization_id, auth.uid(), inv.role)
    on conflict (organization_id, user_id) do nothing;
    if inv.worker_id is not null then
      update public.workers set user_id = auth.uid()
      where id = inv.worker_id and organization_id = inv.organization_id and user_id is null;
    end if;
    update public.invitations set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.accept_invitations() from public, anon;
grant execute on function public.accept_invitations() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Dados pessoais: equipe vê tudo; o trabalhador vê só o que é dele
-- ---------------------------------------------------------------------------
create or replace function public.is_staff(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(org, array['proprietario','admin_ehs','gestor','medico','consultor']::public.member_role[]);
$$;

create or replace function public.owns_worker(wid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workers w where w.id = wid and w.user_id = auth.uid());
$$;

drop policy workers_select on public.workers;
create policy workers_select on public.workers for select
  using (public.is_staff(organization_id) or (user_id = auth.uid() and public.is_member(organization_id)));

drop policy actions_select on public.actions;
create policy actions_select on public.actions for select
  using (public.is_staff(organization_id) or public.owns_worker(responsible_id));

drop policy ppe_deliveries_select on public.ppe_deliveries;
create policy ppe_deliveries_select on public.ppe_deliveries for select
  using (public.is_staff(organization_id) or public.owns_worker(worker_id));

drop policy training_attendances_select on public.training_attendances;
create policy training_attendances_select on public.training_attendances for select
  using (public.is_staff(organization_id) or public.owns_worker(worker_id));

drop policy asos_select on public.asos;
create policy asos_select on public.asos for select
  using (public.has_role(organization_id, array['proprietario','admin_ehs','gestor','medico']::public.member_role[])
         or public.owns_worker(worker_id));

create policy worker_exams_own on public.worker_exams for select
  using (public.owns_worker(worker_id));

-- ---------------------------------------------------------------------------
-- 4. EPI: o trabalhador confirma o recebimento no próprio celular
-- ---------------------------------------------------------------------------
alter table public.ppe_deliveries alter column signature_name drop not null;
alter table public.ppe_deliveries
  add column confirmed_at timestamptz,
  add column confirmed_by uuid references auth.users(id),
  add column confirmed_device text;

create or replace function public.confirm_ppe_delivery(p_id uuid, p_device text default null)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  update public.ppe_deliveries
  set confirmed_at = now(), confirmed_by = auth.uid(), confirmed_device = left(p_device, 300)
  where id = p_id and confirmed_at is null and public.owns_worker(worker_id);
  return found;
end;
$$;
revoke all on function public.confirm_ppe_delivery(uuid, text) from public, anon;
grant execute on function public.confirm_ppe_delivery(uuid, text) to authenticated;

grant execute on function public.enabled_modules(uuid), public.has_module(uuid, text),
  public.is_staff(uuid), public.owns_worker(uuid) to authenticated;
