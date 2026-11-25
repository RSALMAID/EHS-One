-- EHS One · 0002 · Permissões da API
-- Projetos Supabase novos podem não liberar automaticamente as tabelas para a
-- API (papéis anon/authenticated). Sem isso a empresa é criada, mas a leitura
-- falha e o cadastro volta para a tela "Sua empresa". As regras por empresa
-- (RLS da 0001) continuam valendo: estas permissões só abrem a porta da API.
-- Pode rodar mais de uma vez.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.has_role(uuid, public.member_role[]) to authenticated;
grant execute on function public.create_organization(text, text, text, integer) to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
