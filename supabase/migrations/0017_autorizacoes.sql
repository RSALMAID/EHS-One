-- EHS One · 0017 · Autorizações e evidências de capacitação
-- Autorizações de trabalho por pessoa (NR-10, NR-33, NR-35, operador de máquina…) com
-- validade, quem autorizou, treinamento exigido e documento assinado; e evidências das
-- turmas de treinamento (lista de presença assinada, certificados, conteúdo, avaliação, fotos).
-- O trabalhador vê no celular as próprias autorizações e os próprios certificados.
--
-- Pode rodar mais de uma vez: se já foi rodado neste banco, não faz nada.

do $migracao$
begin
  if to_regclass('public.work_authorizations') is not null then
    raise notice 'Já rodado antes: nada a fazer.';
    return;
  end if;
  execute $sql$

create table public.work_authorizations (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  worker_id        uuid not null references public.workers(id) on delete restrict,
  kind             text not null check (length(trim(kind)) > 0),   -- código da lista do sistema ou "outra"
  scope            text,             -- ex.: subestação 13,8 kV; ponte rolante 10 t
  training_id      uuid references public.trainings(id) on delete set null,
  issued_on        date not null default current_date,
  valid_until      date check (valid_until is null or valid_until >= issued_on),
  issued_by        text,
  revoked_on       date,
  revoked_reason   text,
  file_path        text,             -- bucket "capacitacoes": <org>/autorizacoes/<autorização>/<arquivo>
  file_name        text,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index work_authorizations_org_idx on public.work_authorizations(organization_id, valid_until);
create index work_authorizations_worker_idx on public.work_authorizations(worker_id);

create table public.training_evidences (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  session_id       uuid not null references public.training_sessions(id) on delete cascade,
  worker_id        uuid references public.workers(id) on delete set null,   -- certificado de uma pessoa
  kind             text not null default 'outro'
                   check (kind in ('lista_presenca', 'certificado', 'conteudo', 'avaliacao', 'foto', 'outro')),
  file_path        text not null,    -- bucket "capacitacoes": <org>/turmas/<turma>/<arquivo>
  file_name        text not null,
  notes            text,
  created_by       uuid references auth.users(id) default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index training_evidences_session_idx on public.training_evidences(session_id);

create or replace function public.capacitacao_same_org_check()
returns trigger language plpgsql security definer set search_path = public as $f$
declare a uuid; b uuid;
begin
  a := new.organization_id; b := a;
  if tg_table_name = 'work_authorizations' then
    select organization_id into a from public.workers where id = new.worker_id;
    if new.training_id is not null then select organization_id into b from public.trainings where id = new.training_id; end if;
  else
    select organization_id into a from public.training_sessions where id = new.session_id;
    if new.worker_id is not null then select organization_id into b from public.workers where id = new.worker_id; end if;
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
  foreach t in array array['work_authorizations', 'training_evidences'] loop
    execute format(
      'create trigger %1$s_same_org before insert or update on public.%1$s
         for each row execute function public.capacitacao_same_org_check();
       create trigger %1$s_touch before update on public.%1$s
         for each row execute function public.touch_updated_at();
       create trigger %1$s_audit after insert or update or delete on public.%1$s
         for each row execute function public.audit_row();
       alter table public.%1$s enable row level security;
       create policy %1$s_select on public.%1$s for select
         using (public.is_staff(organization_id) or (worker_id is not null and public.owns_worker(worker_id)));
       create policy %1$s_write on public.%1$s for all
         using (public.has_role(organization_id, array[''proprietario'',''admin_ehs'',''gestor'']::public.member_role[]))
         with check (public.has_role(organization_id, array[''proprietario'',''admin_ehs'',''gestor'']::public.member_role[]));
       grant select, insert, update, delete on public.%1$s to authenticated;', t);
  end loop;
end $d$;

-- Arquivos num bucket próprio: a equipe vê tudo; o trabalhador só os seus.
insert into storage.buckets (id, name, public) values ('capacitacoes', 'capacitacoes', false)
  on conflict (id) do nothing;
create policy capacitacoes_read on storage.objects for select to authenticated using (
  bucket_id = 'capacitacoes' and (
    public.is_staff(((storage.foldername(name))[1])::uuid)
    or exists (select 1 from public.work_authorizations w
               where w.file_path = storage.objects.name and public.owns_worker(w.worker_id))
    or exists (select 1 from public.training_evidences e
               where e.file_path = storage.objects.name and e.worker_id is not null and public.owns_worker(e.worker_id))));
create policy capacitacoes_write on storage.objects for insert to authenticated with check (
  bucket_id = 'capacitacoes'
  and public.has_role(((storage.foldername(name))[1])::uuid, array['proprietario','admin_ehs','gestor']::public.member_role[]));
create policy capacitacoes_delete on storage.objects for delete to authenticated using (
  bucket_id = 'capacitacoes'
  and public.has_role(((storage.foldername(name))[1])::uuid, array['proprietario','admin_ehs','gestor']::public.member_role[]));

grant execute on function public.capacitacao_same_org_check() to authenticated;

  $sql$;
end $migracao$;

select '0017: pronto no banco' as resultado where to_regclass('public.work_authorizations') is not null;
