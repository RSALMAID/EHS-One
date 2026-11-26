-- EHS One · 0018 · ISO 45001 e ISO 14001
-- Objetivos e metas com medições (6.2), auditorias internas e externas com constatações
-- que viram ações num plano da auditoria (9.2 e 10.2) e análise crítica pela direção (9.3).
-- O que as duas normas pedem de riscos, requisitos legais, competência, comunicação,
-- documentos, emergência, monitoramento e incidentes já está nos outros módulos.
--
-- Pode rodar mais de uma vez: se já foi rodado neste banco, não faz nada.

do $migracao$
begin
  if to_regclass('public.audits') is not null then
    raise notice 'Já rodado antes: nada a fazer.';
    return;
  end if;
  execute $sql$

create table public.iso_objectives (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  standard         text not null default 'ambas' check (standard in ('45001', '14001', 'ambas')),
  title            text not null check (length(trim(title)) > 0),
  indicator        text,             -- ex.: taxa de frequência; kg de resíduo para aterro
  unit             text,
  baseline         numeric,
  target           numeric,
  direction        text not null default 'reduzir' check (direction in ('reduzir', 'aumentar', 'manter')),
  due_on           date,
  responsible_id   uuid references public.workers(id) on delete set null,
  status           text not null default 'em_andamento'
                   check (status in ('em_andamento', 'atingido', 'nao_atingido', 'cancelado')),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.iso_objective_measurements (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  objective_id     uuid not null references public.iso_objectives(id) on delete cascade,
  measured_on      date not null default current_date,
  value            numeric not null,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index iso_objective_measurements_idx on public.iso_objective_measurements(objective_id, measured_on);

create table public.audits (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  number           integer not null,
  standard         text not null default 'ambas' check (standard in ('45001', '14001', 'ambas')),
  kind             text not null default 'interna' check (kind in ('interna', 'externa', 'certificacao')),
  scope            text,
  planned_on       date not null,
  done_on          date,
  auditor          text,
  status           text not null default 'planejada' check (status in ('planejada', 'realizada', 'cancelada')),
  summary          text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, number)
);
create trigger audits_number before insert on public.audits
  for each row execute function public.next_doc_number();

create table public.audit_findings (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  audit_id         uuid not null references public.audits(id) on delete cascade,
  clause           text,             -- ex.: 6.1.2, 7.2, 8.2
  kind             text not null check (kind in ('nc_maior', 'nc_menor', 'observacao', 'oportunidade', 'ponto_forte')),
  description      text not null check (length(trim(description)) > 0),
  evidence         text,
  action_id        uuid references public.actions(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index audit_findings_audit_idx on public.audit_findings(audit_id);

create table public.management_reviews (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  standard         text not null default 'ambas' check (standard in ('45001', '14001', 'ambas')),
  held_on          date not null,
  participants     text,
  inputs           text,             -- entradas (9.3): situação de ações, mudanças, desempenho, auditorias…
  decisions        text,             -- saídas: decisões, recursos, oportunidades de melhoria
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create or replace function public.iso_same_org_check()
returns trigger language plpgsql security definer set search_path = public as $f$
declare a uuid; b uuid;
begin
  a := new.organization_id; b := a;
  if tg_table_name = 'iso_objectives' then
    if new.responsible_id is not null then select organization_id into a from public.workers where id = new.responsible_id; end if;
  elsif tg_table_name = 'iso_objective_measurements' then
    select organization_id into a from public.iso_objectives where id = new.objective_id;
  elsif tg_table_name = 'audit_findings' then
    select organization_id into a from public.audits where id = new.audit_id;
    if new.action_id is not null then select organization_id into b from public.actions where id = new.action_id; end if;
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
  foreach t in array array['iso_objectives', 'iso_objective_measurements', 'audits', 'audit_findings', 'management_reviews'] loop
    execute format(
      'create trigger %1$s_same_org before insert or update on public.%1$s
         for each row execute function public.iso_same_org_check();
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

grant execute on function public.iso_same_org_check() to authenticated;

  $sql$;
end $migracao$;

select '0018: pronto no banco' as resultado where to_regclass('public.audits') is not null;
