-- EHS One · 0004 · EPI
-- Catálogo de EPI (com CA e validade), EPI obrigatório por cargo,
-- entregas com assinatura e baixa automática de estoque (ficha de EPI, NR-6).

create table public.ppe_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null check (length(trim(name)) > 0),
  ca_number        text,                 -- Certificado de Aprovação
  ca_valid_until   date,
  manufacturer     text,
  stock            integer not null default 0 check (stock >= 0),
  replacement_days integer check (replacement_days is null or replacement_days > 0),
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index ppe_items_org_idx on public.ppe_items(organization_id);

-- EPI obrigatório para cada cargo
create table public.ppe_job_roles (
  ppe_item_id     uuid not null references public.ppe_items(id) on delete cascade,
  job_role_id     uuid not null references public.job_roles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  primary key (ppe_item_id, job_role_id)
);

create table public.ppe_deliveries (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  ppe_item_id      uuid not null references public.ppe_items(id) on delete restrict,
  worker_id        uuid not null references public.workers(id) on delete restrict,  -- ficha de EPI é guardada
  delivered_on     date not null default current_date,
  quantity         integer not null default 1 check (quantity > 0),
  reason           text not null default 'primeira'
                   check (reason in ('primeira', 'troca', 'perda', 'dano')),
  ca_number        text,                 -- CA vigente no momento da entrega
  signature_name   text not null check (length(trim(signature_name)) > 0),
  signed_at        timestamptz not null default now(),
  created_by       uuid references auth.users(id) default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index ppe_deliveries_worker_idx on public.ppe_deliveries(organization_id, worker_id, delivered_on desc);

-- Pai e filho na mesma empresa
create or replace function public.ppe_same_org_check()
returns trigger language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid;
begin
  if tg_table_name = 'ppe_job_roles' then
    select organization_id into a from public.ppe_items where id = new.ppe_item_id;
    select organization_id into b from public.job_roles where id = new.job_role_id;
  elsif tg_table_name = 'ppe_deliveries' then
    select organization_id into a from public.ppe_items where id = new.ppe_item_id;
    select organization_id into b from public.workers where id = new.worker_id;
  end if;
  if a is distinct from new.organization_id or b is distinct from new.organization_id then
    raise exception 'registro de outra empresa';
  end if;
  return new;
end;
$$;

-- Baixa de estoque na entrega; devolve ao estoque se a entrega for excluída.
create or replace function public.ppe_stock_move()
returns trigger language plpgsql security definer set search_path = public as $$
declare saldo integer; nome text;
begin
  if tg_op = 'INSERT' then
    select stock, name into saldo, nome from public.ppe_items where id = new.ppe_item_id for update;
    if saldo < new.quantity then
      raise exception 'Estoque insuficiente de "%": há % e a entrega pede %.', nome, saldo, new.quantity;
    end if;
    update public.ppe_items set stock = stock - new.quantity where id = new.ppe_item_id;
    if new.ca_number is null then
      select ca_number into new.ca_number from public.ppe_items where id = new.ppe_item_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    update public.ppe_items set stock = stock + old.quantity where id = old.ppe_item_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger ppe_deliveries_stock_in before insert on public.ppe_deliveries
  for each row execute function public.ppe_stock_move();
create trigger ppe_deliveries_stock_out after delete on public.ppe_deliveries
  for each row execute function public.ppe_stock_move();

do $$
declare t text;
begin
  foreach t in array array['ppe_job_roles', 'ppe_deliveries'] loop
    execute format(
      'create trigger %1$s_same_org before insert or update on public.%1$s
         for each row execute function public.ppe_same_org_check();', t);
  end loop;
  foreach t in array array['ppe_items', 'ppe_deliveries'] loop
    execute format(
      'create trigger %1$s_touch before update on public.%1$s
         for each row execute function public.touch_updated_at();
       create trigger %1$s_audit after insert or update or delete on public.%1$s
         for each row execute function public.audit_row();', t);
  end loop;
  foreach t in array array['ppe_items', 'ppe_job_roles', 'ppe_deliveries'] loop
    execute format(
      'alter table public.%1$s enable row level security;
       create policy %1$s_select on public.%1$s for select using (public.is_member(organization_id));
       create policy %1$s_write on public.%1$s for all
         using (public.has_role(organization_id, array[''proprietario'',''admin_ehs'',''gestor'']::public.member_role[]))
         with check (public.has_role(organization_id, array[''proprietario'',''admin_ehs'',''gestor'']::public.member_role[]));
       grant select, insert, update, delete on public.%1$s to authenticated;', t);
  end loop;
end $$;

grant execute on function public.ppe_same_org_check() to authenticated;
grant execute on function public.ppe_stock_move() to authenticated;
