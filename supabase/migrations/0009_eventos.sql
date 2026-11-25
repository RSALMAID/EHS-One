-- EHS One · 0009 · Eventos, desvios e análise de causas
-- Acidentes, incidentes, quase acidentes, eventos ambientais e desvios numa tabela só.
-- Classificação pela matriz 5×5 (potencial), investigação com árvore de causas,
-- 5 porquês ou Ishikawa (6M); cada causa raiz vira ação no plano do evento.

create type public.event_kind as enum (
  'acidente_com_afastamento', 'acidente_sem_afastamento', 'primeiros_socorros',
  'incidente', 'quase_acidente', 'ambiental', 'desvio_seguranca', 'desvio_ambiental'
);
create type public.event_status as enum ('relatado', 'em_analise', 'em_investigacao', 'concluido', 'cancelado');

create table public.events (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  number             integer not null,
  kind               public.event_kind not null,
  status             public.event_status not null default 'relatado',
  occurred_at        timestamptz not null default now(),
  sector_id          uuid references public.sectors(id) on delete set null,
  location           text,
  description        text not null check (length(trim(description)) > 0),
  immediate_action   text,
  reported_by        uuid references auth.users(id) default auth.uid(),
  hide_reporter      boolean not null default false,   -- "não mostrar meu nome" para a gestão
  -- classificação (gestão)
  severity           smallint check (severity between 1 and 5),
  probability        smallint check (probability between 1 and 5),
  potential_level    smallint generated always as (severity * probability) stored,
  risk_type          public.risk_type,
  -- lesão (acidentes)
  injured_worker_id  uuid references public.workers(id) on delete set null,
  injury_nature      text,
  body_part          text,
  lost_days          integer check (lost_days is null or lost_days >= 0),
  debited_days       integer check (debited_days is null or debited_days >= 0),
  cat_number         text,
  -- ambiental
  env_aspect         text,
  closed_at          timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (organization_id, number)
);
create index events_org_idx on public.events(organization_id, occurred_at desc);

create or replace function public.next_event_number()
returns trigger language plpgsql as $$
begin
  if new.number is null then
    perform pg_advisory_xact_lock(hashtext('event' || new.organization_id::text));
    select coalesce(max(number), 0) + 1 into new.number
    from public.events where organization_id = new.organization_id;
  end if;
  return new;
end;
$$;
create trigger events_number before insert on public.events
  for each row execute function public.next_event_number();

create table public.event_files (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id        uuid not null references public.events(id) on delete cascade,
  file_path       text not null,     -- <organization_id>/eventos/<event_id>/<arquivo>
  file_name       text,
  created_by      uuid references auth.users(id) default auth.uid(),
  created_at      timestamptz not null default now()
);

create table public.event_investigations (
  event_id        uuid primary key references public.events(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  method          text not null default 'arvore' check (method in ('arvore', 'cinco_porques', 'ishikawa')),
  team            text,
  summary         text,
  concluded_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.event_causes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id        uuid not null references public.events(id) on delete cascade,
  parent_id       uuid references public.event_causes(id) on delete cascade,  -- árvore e 5 porquês
  category        text check (category in ('metodo', 'maquina', 'mao_de_obra', 'material', 'meio_ambiente', 'medida')),  -- Ishikawa
  description     text not null check (length(trim(description)) > 0),
  is_root         boolean not null default false,
  action_id       uuid references public.actions(id) on delete set null,
  position        integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index event_causes_event_idx on public.event_causes(event_id, position);

create or replace function public.event_same_org_check()
returns trigger language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid;
begin
  if tg_table_name = 'events' then
    a := new.organization_id; b := a;
    if new.sector_id is not null then select organization_id into a from public.sectors where id = new.sector_id; end if;
    if new.injured_worker_id is not null then select organization_id into b from public.workers where id = new.injured_worker_id; end if;
  else
    select organization_id into a from public.events where id = new.event_id;
    b := a;
    if tg_table_name = 'event_causes' then
      if new.parent_id is not null then
        select organization_id into b from public.event_causes where id = new.parent_id;
      end if;
    end if;
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
  foreach t in array array['events', 'event_files', 'event_investigations', 'event_causes'] loop
    execute format(
      'create trigger %1$s_same_org before insert or update on public.%1$s
         for each row execute function public.event_same_org_check();
       alter table public.%1$s enable row level security;
       grant select, insert, update, delete on public.%1$s to authenticated;', t);
  end loop;
  foreach t in array array['events', 'event_investigations', 'event_causes'] loop
    execute format(
      'create trigger %1$s_touch before update on public.%1$s
         for each row execute function public.touch_updated_at();', t);
  end loop;
end $$;
create trigger events_audit after insert or update or delete on public.events
  for each row execute function public.audit_row();
create trigger event_causes_audit after insert or update or delete on public.event_causes
  for each row execute function public.audit_row();

-- Eventos: a equipe vê todos; quem relatou vê os próprios. Qualquer membro relata.
create policy events_select on public.events for select
  using (public.is_staff(organization_id) or reported_by = auth.uid());
create policy events_report on public.events for insert
  with check (public.is_member(organization_id) and reported_by = auth.uid() and status = 'relatado');
create policy events_write on public.events for update
  using (public.has_role(organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[]))
  with check (public.has_role(organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[]));
create policy events_delete on public.events for delete
  using (public.has_role(organization_id, array['proprietario','admin_ehs']::public.member_role[]));

create policy event_files_select on public.event_files for select
  using (public.is_staff(organization_id) or created_by = auth.uid());
create policy event_files_insert on public.event_files for insert
  with check (public.is_staff(organization_id)
              or exists (select 1 from public.events e where e.id = event_id and e.reported_by = auth.uid()));
create policy event_files_delete on public.event_files for delete
  using (public.has_role(organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[]));

create policy event_investigations_all on public.event_investigations for all
  using (public.is_staff(organization_id))
  with check (public.has_role(organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[]));
create policy event_causes_all on public.event_causes for all
  using (public.is_staff(organization_id))
  with check (public.has_role(organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[]));

grant execute on function public.event_same_org_check() to authenticated;
