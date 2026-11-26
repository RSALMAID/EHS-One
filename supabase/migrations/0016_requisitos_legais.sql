-- EHS One · 0016 · Requisitos legais
-- Lista dos requisitos legais aplicáveis (segurança, saúde/higiene, meio ambiente)
-- com avaliação periódica de atendimento e histórico das avaliações (evidência para
-- auditoria e para ISO 45001 6.1.3/9.1.2 e ISO 14001 6.1.3/9.1.2).
-- Requisito não atendido vira ação no plano de ação "Requisitos legais".
--
-- Pode rodar mais de uma vez: se já foi rodado neste banco, não faz nada.

do $migracao$
begin
  if to_regclass('public.legal_requirements') is not null then
    raise notice 'Já rodado antes: nada a fazer.';
    return;
  end if;
  execute $sql$

create table public.legal_requirements (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  area               text not null check (area in ('seguranca', 'saude', 'meio_ambiente')),
  sphere             text not null default 'federal' check (sphere in ('federal', 'estadual', 'municipal', 'outro')),
  source             text not null check (length(trim(source)) > 0),   -- ex.: NR-35, Lei 12.305/2010
  title              text not null check (length(trim(title)) > 0),
  requirement        text,             -- o que a empresa precisa cumprir
  applicable         boolean not null default true,
  sector_id          uuid references public.sectors(id) on delete set null,
  responsible_id     uuid references public.workers(id) on delete set null,
  status             text not null default 'nao_avaliado'
                     check (status in ('nao_avaliado', 'atende', 'atende_parcial', 'nao_atende')),
  last_evaluated_on  date,
  review_months      smallint not null default 12 check (review_months between 1 and 60),
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index legal_requirements_org_idx on public.legal_requirements(organization_id, area);

create table public.legal_evaluations (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  requirement_id     uuid not null references public.legal_requirements(id) on delete cascade,
  evaluated_on       date not null default current_date,
  status             text not null check (status in ('atende', 'atende_parcial', 'nao_atende')),
  evidence           text,             -- documento, registro, foto, número do laudo…
  evaluator          text,
  action_id          uuid references public.actions(id) on delete set null,
  created_by         uuid references auth.users(id) default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index legal_evaluations_req_idx on public.legal_evaluations(requirement_id, evaluated_on desc);

create or replace function public.legal_same_org_check()
returns trigger language plpgsql security definer set search_path = public as $f$
declare a uuid; b uuid;
begin
  a := new.organization_id; b := a;
  if tg_table_name = 'legal_requirements' then
    if new.sector_id is not null then select organization_id into a from public.sectors where id = new.sector_id; end if;
    if new.responsible_id is not null then select organization_id into b from public.workers where id = new.responsible_id; end if;
  else
    select organization_id into a from public.legal_requirements where id = new.requirement_id;
    if new.action_id is not null then select organization_id into b from public.actions where id = new.action_id; end if;
  end if;
  if a is distinct from new.organization_id or b is distinct from new.organization_id then
    raise exception 'registro de outra empresa';
  end if;
  return new;
end;
$f$;

-- A avaliação mais recente define a situação atual do requisito.
create or replace function public.legal_evaluation_sync()
returns trigger language plpgsql security definer set search_path = public as $f$
declare rid uuid := coalesce(new.requirement_id, old.requirement_id); u record;
begin
  select status, evaluated_on into u from public.legal_evaluations
  where requirement_id = rid order by evaluated_on desc, created_at desc limit 1;
  update public.legal_requirements
     set status = coalesce(u.status, 'nao_avaliado'), last_evaluated_on = u.evaluated_on
   where id = rid;
  return null;
end;
$f$;

do $d$
declare t text;
begin
  foreach t in array array['legal_requirements', 'legal_evaluations'] loop
    execute format(
      'create trigger %1$s_same_org before insert or update on public.%1$s
         for each row execute function public.legal_same_org_check();
       create trigger %1$s_touch before update on public.%1$s
         for each row execute function public.touch_updated_at();
       create trigger %1$s_audit after insert or update or delete on public.%1$s
         for each row execute function public.audit_row();
       alter table public.%1$s enable row level security;
       create policy %1$s_select on public.%1$s for select using (public.is_staff(organization_id));
       create policy %1$s_write on public.%1$s for all
         using (public.has_role(organization_id, array[''proprietario'',''admin_ehs'',''gestor'']::public.member_role[]))
         with check (public.has_role(organization_id, array[''proprietario'',''admin_ehs'',''gestor'']::public.member_role[]));
       grant select, insert, update, delete on public.%1$s to authenticated;', t);
  end loop;
end $d$;

create trigger legal_evaluations_sync after insert or update or delete on public.legal_evaluations
  for each row execute function public.legal_evaluation_sync();

grant execute on function public.legal_same_org_check(), public.legal_evaluation_sync() to authenticated;

  $sql$;
end $migracao$;

select '0016: pronto no banco' as resultado where to_regclass('public.legal_requirements') is not null;
