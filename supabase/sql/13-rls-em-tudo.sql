-- IDE · garante RLS ligado em TODAS as tabelas do schema public. Pode rodar mais de uma vez. Não apaga dados.

-- 1) liga o RLS em toda tabela que ainda estiver sem
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname = 'public' and not rowsecurity
  loop execute format('alter table public.%I enable row level security', t.tablename); end loop;
end $$;

-- 2) conferência: toda linha deve mostrar rls_ligado = true
select c.relname as tabela, c.relrowsecurity as rls_ligado,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as politicas
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
