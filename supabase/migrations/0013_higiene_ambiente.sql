-- EHS One · 0013 · Higiene ocupacional e meio ambiente
-- Higiene: GHE (grupos de exposição) e avaliações quantitativas com limite de tolerância
-- e nível de ação. Meio ambiente: aspectos e impactos (LAIA) e registro de resíduos.
-- Só a equipe vê e edita.
--
-- Pode rodar mais de uma vez: se já foi rodado neste banco, não faz nada.

do $migracao$
begin
  if to_regclass('public.exposure_groups') is not null then
    raise notice 'Já rodado antes: nada a fazer.';
    return;
  end if;
  execute $sql$

/* ---------------- Higiene ocupacional ---------------- */

-- GHE: grupo de trabalhadores com exposição parecida
create table public.exposure_groups (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null check (length(trim(name)) > 0),
  sector_id        uuid references public.sectors(id) on delete set null,
  activities       text,
  workers_count    integer check (workers_count is null or workers_count >= 0),
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Avaliação quantitativa de um agente no GHE (ruído, calor, poeira, químicos…)
create table public.exposure_assessments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  group_id         uuid not null references public.exposure_groups(id) on delete cascade,
  agent            text not null check (length(trim(agent)) > 0),
  agent_type       text not null default 'fisico' check (agent_type in ('fisico', 'quimico', 'biologico')),
  method           text,              -- ex.: NHO-01, NHO-06, NIOSH 0500
  measured_on      date not null default current_date,
  result           numeric not null,
  unit             text not null,     -- ex.: dB(A), IBUTG °C, mg/m³, ppm
  limit_value      numeric check (limit_value is null or limit_value > 0),   -- limite de tolerância (NR-15) ou TLV
  action_level     numeric check (action_level is null or action_level > 0), -- nível de ação (NR-09)
  equipment        text,
  evaluator        text,
  notes            text,
  created_by       uuid references auth.users(id) default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index exposure_assessments_group_idx on public.exposure_assessments(group_id, measured_on desc);

/* ---------------- Meio ambiente ---------------- */

-- Levantamento de aspectos e impactos ambientais (LAIA)
create table public.env_aspects (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  sector_id        uuid references public.sectors(id) on delete set null,
  activity         text not null check (length(trim(activity)) > 0),
  aspect           text not null check (length(trim(aspect)) > 0),   -- ex.: geração de resíduo oleoso
  impact           text not null check (length(trim(impact)) > 0),   -- ex.: contaminação do solo
  condition        text not null default 'normal' check (condition in ('normal', 'anormal', 'emergencia')),
  severity         smallint not null check (severity between 1 and 5),
  probability      smallint not null check (probability between 1 and 5),
  significance     smallint generated always as (severity * probability) stored,
  legal_requirement text,
  controls         text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Registro de resíduos gerados e destinados
create table public.waste_records (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  recorded_on      date not null default current_date,
  waste            text not null check (length(trim(waste)) > 0),
  waste_class      text not null default 'IIA' check (waste_class in ('I', 'IIA', 'IIB')),
  quantity         numeric not null check (quantity > 0),
  unit             text not null default 'kg' check (unit in ('kg', 't', 'L', 'm3', 'un')),
  destination      text,             -- ex.: reciclagem, coprocessamento, aterro classe I
  transporter      text,
  mtr_number       text,             -- Manifesto de Transporte de Resíduos
  sector_id        uuid references public.sectors(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index waste_records_org_idx on public.waste_records(organization_id, recorded_on desc);

create or replace function public.hyg_env_same_org_check()
returns trigger language plpgsql security definer set search_path = public as $f$
declare a uuid; b uuid;
begin
  a := new.organization_id; b := a;
  if tg_table_name = 'exposure_assessments' then
    select organization_id into a from public.exposure_groups where id = new.group_id;
  else
    if new.sector_id is not null then select organization_id into a from public.sectors where id = new.sector_id; end if;
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
  foreach t in array array['exposure_groups', 'exposure_assessments', 'env_aspects', 'waste_records'] loop
    execute format(
      'create trigger %1$s_same_org before insert or update on public.%1$s
         for each row execute function public.hyg_env_same_org_check();
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

grant execute on function public.hyg_env_same_org_check() to authenticated;

  $sql$;
end $migracao$;

select '0013: pronto no banco' as resultado where to_regclass('public.exposure_groups') is not null;
