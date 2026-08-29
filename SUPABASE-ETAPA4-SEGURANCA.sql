-- =========================================================
-- MANGORA V18 CLOUD - ETAPA 4 / FECHAMENTO DE SEGURANÇA
-- Execute uma única vez no SQL Editor do Supabase.
-- =========================================================

-- Lista explícita de administradores.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Autoriza os usuários que JÁ EXISTEM no Auth no momento desta migração.
-- Assim o usuário administrativo atual continua funcionando.
insert into public.admin_users (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Função segura usada pelas políticas.
create or replace function public.is_mangora_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_mangora_admin() from public;
grant execute on function public.is_mangora_admin() to authenticated;

-- Remove acesso direto anônimo a dados de operação.
revoke insert, update, delete, select on table public.pedidos from anon;
revoke insert, update, delete, select on table public.itens_pedido from anon;
revoke insert, update, delete, select on table public.clientes from anon;
revoke all on table public.despesas from anon;
revoke all on table public.materias_primas from anon;

-- Cliente público só precisa consultar cardápio/configuração.
grant select on table public.precos_carte to anon;
grant select on table public.config_monte to anon;

-- O pedido público entra somente pela função segura criada na Etapa 2.
grant execute on function public.criar_pedido_publico(jsonb,jsonb) to anon, authenticated;
grant execute on function public.acompanhar_pedido_publico(uuid) to anon, authenticated;

-- Remove políticas administrativas permissivas anteriores.
drop policy if exists "autenticado pode consultar precos carte" on public.precos_carte;
drop policy if exists "autenticado pode inserir precos carte" on public.precos_carte;
drop policy if exists "autenticado pode alterar precos carte" on public.precos_carte;

drop policy if exists "autenticado pode consultar config monte" on public.config_monte;
drop policy if exists "autenticado pode inserir config monte" on public.config_monte;
drop policy if exists "autenticado pode alterar config monte" on public.config_monte;

drop policy if exists "autenticado pode criar pedidos" on public.pedidos;
drop policy if exists "autenticado pode consultar pedidos" on public.pedidos;
drop policy if exists "autenticado pode alterar pedidos" on public.pedidos;
drop policy if exists "autenticado pode excluir pedidos" on public.pedidos;

drop policy if exists "autenticado pode criar itens pedido" on public.itens_pedido;
drop policy if exists "autenticado pode consultar itens pedido" on public.itens_pedido;
drop policy if exists "autenticado pode alterar itens pedido" on public.itens_pedido;
drop policy if exists "autenticado pode excluir itens pedido" on public.itens_pedido;

drop policy if exists "autenticado pode criar cliente" on public.clientes;
drop policy if exists "autenticado pode consultar clientes" on public.clientes;
drop policy if exists "autenticado pode alterar clientes" on public.clientes;
drop policy if exists "autenticado pode excluir clientes" on public.clientes;

drop policy if exists "autenticado pode consultar despesas" on public.despesas;
drop policy if exists "autenticado pode criar despesas" on public.despesas;
drop policy if exists "autenticado pode alterar despesas" on public.despesas;
drop policy if exists "autenticado pode excluir despesas" on public.despesas;

drop policy if exists "autenticado pode consultar materias primas" on public.materias_primas;
drop policy if exists "autenticado pode criar materias primas" on public.materias_primas;
drop policy if exists "autenticado pode alterar materias primas" on public.materias_primas;
drop policy if exists "autenticado pode excluir materias primas" on public.materias_primas;

-- Políticas administrativas restritas à lista admin_users.
create policy "admin consulta precos carte"
on public.precos_carte for select to authenticated
using (public.is_mangora_admin());

create policy "admin insere precos carte"
on public.precos_carte for insert to authenticated
with check (public.is_mangora_admin());

create policy "admin altera precos carte"
on public.precos_carte for update to authenticated
using (public.is_mangora_admin())
with check (public.is_mangora_admin());

create policy "admin consulta config monte"
on public.config_monte for select to authenticated
using (public.is_mangora_admin());

create policy "admin insere config monte"
on public.config_monte for insert to authenticated
with check (public.is_mangora_admin());

create policy "admin altera config monte"
on public.config_monte for update to authenticated
using (public.is_mangora_admin())
with check (public.is_mangora_admin());

create policy "admin consulta pedidos"
on public.pedidos for select to authenticated
using (public.is_mangora_admin());

create policy "admin cria pedidos"
on public.pedidos for insert to authenticated
with check (public.is_mangora_admin());

create policy "admin altera pedidos"
on public.pedidos for update to authenticated
using (public.is_mangora_admin())
with check (public.is_mangora_admin());

create policy "admin exclui pedidos"
on public.pedidos for delete to authenticated
using (public.is_mangora_admin());

create policy "admin consulta itens pedido"
on public.itens_pedido for select to authenticated
using (public.is_mangora_admin());

create policy "admin cria itens pedido"
on public.itens_pedido for insert to authenticated
with check (public.is_mangora_admin());

create policy "admin altera itens pedido"
on public.itens_pedido for update to authenticated
using (public.is_mangora_admin())
with check (public.is_mangora_admin());

create policy "admin exclui itens pedido"
on public.itens_pedido for delete to authenticated
using (public.is_mangora_admin());

create policy "admin consulta clientes"
on public.clientes for select to authenticated
using (public.is_mangora_admin());

create policy "admin cria clientes"
on public.clientes for insert to authenticated
with check (public.is_mangora_admin());

create policy "admin altera clientes"
on public.clientes for update to authenticated
using (public.is_mangora_admin())
with check (public.is_mangora_admin());

create policy "admin exclui clientes"
on public.clientes for delete to authenticated
using (public.is_mangora_admin());

create policy "admin consulta despesas"
on public.despesas for select to authenticated
using (public.is_mangora_admin());

create policy "admin cria despesas"
on public.despesas for insert to authenticated
with check (public.is_mangora_admin());

create policy "admin altera despesas"
on public.despesas for update to authenticated
using (public.is_mangora_admin())
with check (public.is_mangora_admin());

create policy "admin exclui despesas"
on public.despesas for delete to authenticated
using (public.is_mangora_admin());

create policy "admin consulta materias primas"
on public.materias_primas for select to authenticated
using (public.is_mangora_admin());

create policy "admin cria materias primas"
on public.materias_primas for insert to authenticated
with check (public.is_mangora_admin());

create policy "admin altera materias primas"
on public.materias_primas for update to authenticated
using (public.is_mangora_admin())
with check (public.is_mangora_admin());

create policy "admin exclui materias primas"
on public.materias_primas for delete to authenticated
using (public.is_mangora_admin());

-- Grants da Data API continuam necessários.
grant usage on schema public to authenticated;
grant select, insert, update on public.precos_carte, public.config_monte to authenticated;
grant select, insert, update, delete on
  public.pedidos,
  public.itens_pedido,
  public.clientes,
  public.despesas,
  public.materias_primas
to authenticated;
grant usage, select on all sequences in schema public to authenticated;
