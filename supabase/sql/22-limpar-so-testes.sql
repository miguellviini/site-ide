-- IDE · limpa do histórico de auditoria SÓ o que veio dos testes (dados "ZZTESTE", contas/matrículas/pedidos de teste já apagados).
-- Mantém o histórico das alterações reais. Rode UMA vez. Não apaga dados do clube.
delete from public.auditoria
where antes::text ilike '%zzteste%'
   or depois::text ilike '%zzteste%'
   or tabela = 'pedidos_senha'
   or (tabela = 'perfis'     and registro not in (select id::text from public.perfis))
   or (tabela = 'matriculas' and registro not in (select id::text from public.matriculas));

select count(*) as registros_que_restaram from public.auditoria;
