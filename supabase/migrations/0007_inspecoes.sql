-- EHS One · 0007 · Inspeções e checklists
-- Modelos de checklist com perguntas; inspeções feitas a partir de um modelo;
-- cada resposta "não conforme" pode virar ação na Central de Ações.

create table public.checklist_templates (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null check (length(trim(name)) > 0),
  description      text,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.checklist_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  template_id      uuid not null references public.checklist_templates(id) on delete cascade,
  position         integer not null default 0,
  question         text not null check (length(trim(question)) > 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index checklist_items_template_idx on public.checklist_items(template_id, position);

create table public.inspections (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  template_id      uuid not null references public.checklist_templates(id) on delete restrict,
  sector_id        uuid references public.sectors(id) on delete set null,
  inspected_on     date not null default current_date,
  inspector        text,
  status           text not null default 'em_andamento' check (status in ('em_andamento', 'concluida')),
  notes            text,
  concluded_at     timestamptz,
  created_by       uuid references auth.users(id) default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index inspections_org_idx on public.inspections(organization_id, inspected_on desc);

create table public.inspection_answers (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  inspection_id    uuid not null references public.inspections(id) on delete cascade,
  item_id          uuid references public.checklist_items(id) on delete set null,
  question         text not null,     -- cópia da pergunta: o histórico não muda se o modelo mudar
  position         integer not null default 0,
  answer           text check (answer in ('conforme', 'nao_conforme', 'na')),
  comment          text,
  action_id        uuid references public.actions(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (inspection_id, item_id)
);

create or replace function public.inspection_same_org_check()
returns trigger language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid;
begin
  if tg_table_name = 'checklist_items' then
    select organization_id into a from public.checklist_templates where id = new.template_id;
    b := a;
  elsif tg_table_name = 'inspections' then
    select organization_id into a from public.checklist_templates where id = new.template_id;
    b := a;
    if new.sector_id is not null then
      select organization_id into b from public.sectors where id = new.sector_id;
    end if;
  elsif tg_table_name = 'inspection_answers' then
    select organization_id into a from public.inspections where id = new.inspection_id;
    b := a;
    if new.action_id is not null then
      select organization_id into b from public.actions where id = new.action_id;
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
  foreach t in array array['checklist_items', 'inspections', 'inspection_answers'] loop
    execute format(
      'create trigger %1$s_same_org before insert or update on public.%1$s
         for each row execute function public.inspection_same_org_check();', t);
  end loop;
  foreach t in array array['checklist_templates', 'checklist_items', 'inspections', 'inspection_answers'] loop
    execute format(
      'create trigger %1$s_touch before update on public.%1$s
         for each row execute function public.touch_updated_at();
       create trigger %1$s_audit after insert or update or delete on public.%1$s
         for each row execute function public.audit_row();
       alter table public.%1$s enable row level security;
       create policy %1$s_select on public.%1$s for select using (public.is_member(organization_id));
       create policy %1$s_write on public.%1$s for all
         using (public.has_role(organization_id, array[''proprietario'',''admin_ehs'',''gestor'']::public.member_role[]))
         with check (public.has_role(organization_id, array[''proprietario'',''admin_ehs'',''gestor'']::public.member_role[]));
       grant select, insert, update, delete on public.%1$s to authenticated;', t);
  end loop;
end $$;

grant execute on function public.inspection_same_org_check() to authenticated;
