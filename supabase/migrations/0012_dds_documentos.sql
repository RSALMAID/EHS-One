-- EHS One · 0012 · DDS, comunicados e documentos
-- DDS: diálogo de segurança com presença confirmada no celular de cada participante.
-- Comunicados: avisos da equipe com "li e entendi".
-- Documentos: biblioteca (PGR, PCMSO, laudos, procedimentos…) com versão, validade
-- e arquivo; a equipe decide o que o trabalhador vê.

/* ---------------- DDS ---------------- */

create table public.dds_talks (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  number           integer not null,
  title            text not null check (length(trim(title)) > 0),
  content          text,
  held_on          date not null default current_date,
  sector_id        uuid references public.sectors(id) on delete set null,
  facilitator      text,
  status           text not null default 'aberto' check (status in ('aberto', 'encerrado')),
  created_by       uuid references auth.users(id) default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, number)
);
create trigger dds_talks_number before insert on public.dds_talks
  for each row execute function public.next_doc_number();

create table public.dds_attendances (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  talk_id          uuid not null references public.dds_talks(id) on delete cascade,
  worker_id        uuid not null references public.workers(id) on delete restrict,
  confirmed_at     timestamptz,
  confirmed_device text,
  created_at       timestamptz not null default now(),
  unique (talk_id, worker_id)
);
create index dds_attendances_worker_idx on public.dds_attendances(worker_id, confirmed_at);

/* ---------------- Comunicados ---------------- */

create table public.announcements (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  title            text not null check (length(trim(title)) > 0),
  body             text not null check (length(trim(body)) > 0),
  expires_on       date,
  created_by       uuid references auth.users(id) default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index announcements_org_idx on public.announcements(organization_id, created_at desc);

create table public.announcement_reads (
  announcement_id  uuid not null references public.announcements(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade default auth.uid(),
  read_at          timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

/* ---------------- Documentos ---------------- */

create table public.documents (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  title              text not null check (length(trim(title)) > 0),
  category           text not null default 'outro'
                     check (category in ('programa', 'laudo', 'procedimento', 'politica', 'licenca', 'certificado', 'outro')),
  sector_id          uuid references public.sectors(id) on delete set null,
  version            text,
  issued_on          date,
  valid_until        date,
  responsible        text,
  notes              text,
  file_path          text,           -- bucket "documentos": <org>/<documento>/<arquivo>
  file_name          text,
  visible_to_workers boolean not null default false,
  created_by         uuid references auth.users(id) default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index documents_org_idx on public.documents(organization_id, valid_until);

/* ---------------- Regras comuns ---------------- */

create or replace function public.dds_doc_same_org_check()
returns trigger language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid;
begin
  a := new.organization_id; b := a;
  if tg_table_name in ('dds_talks', 'documents') then
    if new.sector_id is not null then select organization_id into a from public.sectors where id = new.sector_id; end if;
  elsif tg_table_name = 'dds_attendances' then
    select organization_id into a from public.dds_talks where id = new.talk_id;
    select organization_id into b from public.workers where id = new.worker_id;
  elsif tg_table_name = 'announcement_reads' then
    select organization_id into a from public.announcements where id = new.announcement_id;
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
  foreach t in array array['dds_talks', 'dds_attendances', 'announcements', 'announcement_reads', 'documents'] loop
    execute format(
      'create trigger %1$s_same_org before insert or update on public.%1$s
         for each row execute function public.dds_doc_same_org_check();
       alter table public.%1$s enable row level security;
       grant select, insert, update, delete on public.%1$s to authenticated;', t);
  end loop;
  -- Leituras de comunicado não entram na auditoria (não têm id próprio e são só "li").
  foreach t in array array['dds_talks', 'dds_attendances', 'announcements', 'documents'] loop
    execute format(
      'create trigger %1$s_audit after insert or update or delete on public.%1$s
         for each row execute function public.audit_row();', t);
  end loop;
  foreach t in array array['dds_talks', 'announcements', 'documents'] loop
    execute format(
      'create trigger %1$s_touch before update on public.%1$s
         for each row execute function public.touch_updated_at();
       create policy %1$s_write on public.%1$s for all
         using (public.has_role(organization_id, array[''proprietario'',''admin_ehs'',''gestor'']::public.member_role[]))
         with check (public.has_role(organization_id, array[''proprietario'',''admin_ehs'',''gestor'']::public.member_role[]));', t);
  end loop;
end $$;

-- DDS: a equipe vê tudo; o trabalhador vê os DDS em que está na lista, e os abertos (para entrar).
create policy dds_talks_select on public.dds_talks for select using (
  public.is_staff(organization_id)
  or (public.is_member(organization_id) and status = 'aberto')
  or exists (select 1 from public.dds_attendances p where p.talk_id = dds_talks.id and public.owns_worker(p.worker_id)));
create policy dds_attendances_select on public.dds_attendances for select
  using (public.is_staff(organization_id) or public.owns_worker(worker_id));
create policy dds_attendances_write on public.dds_attendances for all
  using (public.has_role(organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[]))
  with check (public.has_role(organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[]));

-- O próprio trabalhador confirma presença num DDS aberto (entra na lista se ainda não estiver).
create or replace function public.confirm_dds(p_talk uuid, p_device text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare t record; wid uuid;
begin
  select * into t from public.dds_talks where id = p_talk;
  if t is null or t.status <> 'aberto' or not public.is_member(t.organization_id) then return false; end if;
  select id into wid from public.workers
  where organization_id = t.organization_id and user_id = auth.uid() limit 1;
  if wid is null then return false; end if;
  insert into public.dds_attendances (organization_id, talk_id, worker_id, confirmed_at, confirmed_device)
  values (t.organization_id, p_talk, wid, now(), left(p_device, 300))
  on conflict (talk_id, worker_id) do update
    set confirmed_at = coalesce(public.dds_attendances.confirmed_at, excluded.confirmed_at),
        confirmed_device = coalesce(public.dds_attendances.confirmed_device, excluded.confirmed_device);
  return true;
end;
$$;

-- Comunicados: todos da empresa leem; cada um marca a própria leitura; a equipe vê quem leu.
create policy announcements_select on public.announcements for select using (public.is_member(organization_id));
create policy announcement_reads_select on public.announcement_reads for select
  using (public.is_staff(organization_id) or user_id = auth.uid());
create policy announcement_reads_insert on public.announcement_reads for insert
  with check (user_id = auth.uid() and public.is_member(organization_id));

-- Documentos: a equipe vê todos; o trabalhador só os marcados como visíveis.
create policy documents_select on public.documents for select
  using (public.is_staff(organization_id) or (visible_to_workers and public.is_member(organization_id)));

-- Arquivos dos documentos num bucket próprio, com a mesma regra de visibilidade.
insert into storage.buckets (id, name, public) values ('documentos', 'documentos', false)
  on conflict (id) do nothing;
create policy documentos_read on storage.objects for select to authenticated using (
  bucket_id = 'documentos' and exists (
    select 1 from public.documents d where d.file_path = storage.objects.name
      and (public.is_staff(d.organization_id) or (d.visible_to_workers and public.is_member(d.organization_id)))));
create policy documentos_write on storage.objects for insert to authenticated with check (
  bucket_id = 'documentos'
  and public.has_role(((storage.foldername(name))[1])::uuid, array['proprietario','admin_ehs','gestor']::public.member_role[]));
create policy documentos_delete on storage.objects for delete to authenticated using (
  bucket_id = 'documentos'
  and public.has_role(((storage.foldername(name))[1])::uuid, array['proprietario','admin_ehs','gestor']::public.member_role[]));

revoke all on function public.confirm_dds(uuid, text) from public, anon;
grant execute on function public.confirm_dds(uuid, text) to authenticated;
grant execute on function public.dds_doc_same_org_check() to authenticated;
