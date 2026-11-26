-- EHS One · 0019 · Planos pagos
-- Catálogo de planos, pedido de mudança de plano feito pela empresa, área da equipe
-- EHS One (administradores da plataforma) para mudar plano, prazo do teste e módulos
-- extras de cada empresa. O cliente não consegue mudar o próprio plano.
-- Ao fim do teste sem plano escolhido, nenhum módulo fica liberado até a equipe EHS One
-- definir o plano (os dados ficam guardados).
--
-- Pode rodar mais de uma vez: se já foi rodado neste banco, não faz nada.

do $migracao$
begin
  if to_regclass('public.plan_requests') is not null then
    raise notice 'Já rodado antes: nada a fazer.';
    return;
  end if;
  execute $sql$

create table public.plans (
  code         text primary key,
  name         text not null,
  description  text,
  price_label  text,                 -- ex.: "R$ 199/mês"; vazio = sob consulta
  sort         integer not null default 0,
  listed       boolean not null default true   -- aparece na tela de planos
);
insert into public.plans (code, name, description, sort, listed) values
  ('teste', 'Teste grátis', 'Todos os módulos por 14 dias.', 0, false),
  ('essencial', 'Essencial', 'O básico de SST: cadastros, PGR, plano de ação, EPI, treinamentos, saúde, eventos, inspeções, DDS, documentos e HHT.', 10, true),
  ('profissional', 'Profissional', 'Tudo do Essencial, mais APR e PT, análise de causas, autorizações, CIPA e SESMT, requisitos legais e painel.', 20, true),
  ('empresa', 'Completo', 'Todos os módulos, incluindo higiene ocupacional, meio ambiente e ISO 45001/14001.', 30, true),
  ('consultor', 'Consultor', 'Para consultorias que atendem várias empresas. Todos os módulos.', 40, true)
on conflict (code) do nothing;
alter table public.plans enable row level security;
create policy plans_read on public.plans for select using (true);
grant select on public.plans to authenticated;

/* ---------------- Administradores da plataforma (equipe EHS One) ---------------- */

create table public.platform_admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
create policy platform_admins_self on public.platform_admins for select using (user_id = auth.uid());
grant select on public.platform_admins to authenticated;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $f$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$f$;

-- O proprietário edita os dados da empresa, mas plano e prazo do teste só a equipe EHS One
-- (ou o SQL Editor, que roda sem usuário logado).
create or replace function public.protect_org_plan()
returns trigger language plpgsql security definer set search_path = public as $f$
begin
  if (new.plan is distinct from old.plan or new.trial_ends_at is distinct from old.trial_ends_at)
     and auth.uid() is not null and not public.is_platform_admin() then
    raise exception 'Só a equipe EHS One muda o plano. Use "Pedir mudança de plano".';
  end if;
  return new;
end;
$f$;
create trigger organizations_protect_plan before update on public.organizations
  for each row execute function public.protect_org_plan();

-- Módulos liberados: teste vencido não libera nenhum módulo do plano.
create or replace function public.enabled_modules(org uuid)
returns setof text
language sql stable security definer set search_path = public
as $f$
  with o as (
    select id, case when plan = 'teste' and trial_ends_at < now() then null else plan end as plano
    from public.organizations where id = org
  )
  select pm.module_code
  from o join public.plan_modules pm on pm.plan = o.plano
  where public.is_member(org)
    and not exists (select 1 from public.organization_modules x
                    where x.organization_id = org and x.module_code = pm.module_code and not x.enabled)
  union
  select x.module_code from public.organization_modules x
  where x.organization_id = org and x.enabled and public.is_member(org);
$f$;

/* ---------------- Pedidos de mudança de plano ---------------- */

create table public.plan_requests (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  requested_plan   text not null references public.plans(code),
  note             text,
  status           text not null default 'pendente' check (status in ('pendente', 'atendido', 'cancelado')),
  answer           text,
  requested_by     uuid references auth.users(id) default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index plan_requests_status_idx on public.plan_requests(status, created_at);
create trigger plan_requests_touch before update on public.plan_requests
  for each row execute function public.touch_updated_at();
create trigger plan_requests_audit after insert or update or delete on public.plan_requests
  for each row execute function public.audit_row();
alter table public.plan_requests enable row level security;
create policy plan_requests_select on public.plan_requests for select
  using (public.has_role(organization_id, array['proprietario','admin_ehs']::public.member_role[]) or public.is_platform_admin());
create policy plan_requests_insert on public.plan_requests for insert
  with check (public.has_role(organization_id, array['proprietario','admin_ehs']::public.member_role[])
              and status = 'pendente' and requested_by = auth.uid());
create policy plan_requests_admin on public.plan_requests for update
  using (public.is_platform_admin()) with check (public.is_platform_admin());
grant select, insert, update on public.plan_requests to authenticated;

/* ---------------- Funções da equipe EHS One ---------------- */

create or replace function public.admin_organizations()
returns table (id uuid, name text, plan text, trial_ends_at timestamptz, created_at timestamptz,
               members bigint, workers bigint, pending_requests bigint, extra_modules text[], removed_modules text[])
language plpgsql stable security definer set search_path = public as $f$
begin
  if not public.is_platform_admin() then raise exception 'Acesso só da equipe EHS One.'; end if;
  return query
  select o.id, o.name, o.plan, o.trial_ends_at, o.created_at,
         (select count(*) from public.memberships m where m.organization_id = o.id),
         (select count(*) from public.workers w where w.organization_id = o.id and w.active),
         (select count(*) from public.plan_requests r where r.organization_id = o.id and r.status = 'pendente'),
         coalesce((select array_agg(x.module_code order by x.module_code) from public.organization_modules x
                   where x.organization_id = o.id and x.enabled), '{}'),
         coalesce((select array_agg(x.module_code order by x.module_code) from public.organization_modules x
                   where x.organization_id = o.id and not x.enabled), '{}')
  from public.organizations o
  order by o.created_at desc;
end;
$f$;

create or replace function public.admin_set_plan(p_org uuid, p_plan text, p_trial_ends date default null)
returns void language plpgsql security definer set search_path = public as $f$
begin
  if not public.is_platform_admin() then raise exception 'Acesso só da equipe EHS One.'; end if;
  if not exists (select 1 from public.plans where code = p_plan) then raise exception 'Plano inexistente.'; end if;
  update public.organizations
     set plan = p_plan,
         trial_ends_at = coalesce(p_trial_ends::timestamp + interval '23 hours 59 minutes', trial_ends_at)
   where id = p_org;
end;
$f$;

-- p_enabled: true = libera além do plano; false = tira do plano; null = volta ao que o plano diz.
create or replace function public.admin_set_module(p_org uuid, p_module text, p_enabled boolean)
returns void language plpgsql security definer set search_path = public as $f$
begin
  if not public.is_platform_admin() then raise exception 'Acesso só da equipe EHS One.'; end if;
  if p_enabled is null then
    delete from public.organization_modules where organization_id = p_org and module_code = p_module;
  else
    insert into public.organization_modules (organization_id, module_code, enabled)
    values (p_org, p_module, p_enabled)
    on conflict (organization_id, module_code) do update set enabled = excluded.enabled;
  end if;
end;
$f$;

revoke all on function public.admin_organizations(), public.admin_set_plan(uuid, text, date),
  public.admin_set_module(uuid, text, boolean) from public, anon;
grant execute on function public.admin_organizations(), public.admin_set_plan(uuid, text, date),
  public.admin_set_module(uuid, text, boolean), public.is_platform_admin() to authenticated;

  $sql$;
end $migracao$;

select '0019: pronto no banco' as resultado where to_regclass('public.plan_requests') is not null;
