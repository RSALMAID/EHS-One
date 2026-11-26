-- EHS One · 0014 · HHT (horas-homem trabalhadas) por mês
-- Base para as taxas do Painel: frequência (TF) e gravidade (TG), conforme a NBR 14280.
--
-- Pode rodar mais de uma vez: se já foi rodado neste banco, não faz nada.

do $migracao$
begin
  if to_regclass('public.hht_records') is not null then
    raise notice 'Já rodado antes: nada a fazer.';
    return;
  end if;
  execute $sql$

create table public.hht_records (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  month            date not null check (extract(day from month) = 1),   -- primeiro dia do mês
  workers_count    integer not null check (workers_count >= 0),
  hours_worked     numeric not null check (hours_worked >= 0),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, month)
);

create trigger hht_records_touch before update on public.hht_records
  for each row execute function public.touch_updated_at();
create trigger hht_records_audit after insert or update or delete on public.hht_records
  for each row execute function public.audit_row();
alter table public.hht_records enable row level security;
create policy hht_records_select on public.hht_records for select using (public.is_staff(organization_id));
create policy hht_records_write on public.hht_records for all
  using (public.has_role(organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[]))
  with check (public.has_role(organization_id, array['proprietario','admin_ehs','gestor']::public.member_role[]));
grant select, insert, update, delete on public.hht_records to authenticated;

  $sql$;
end $migracao$;

select '0014: pronto no banco' as resultado where to_regclass('public.hht_records') is not null;
