-- MANGORA V18 CLOUD - ETAPA 3
-- Permissões dos módulos administrativos.
-- Pode ser executado mesmo se os GRANTs anteriores já foram aplicados.

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.clientes to authenticated;
grant select, insert, update, delete on table public.despesas to authenticated;
grant select, insert, update, delete on table public.materias_primas to authenticated;
grant usage, select on all sequences in schema public to authenticated;
