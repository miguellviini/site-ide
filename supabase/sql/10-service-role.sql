-- Corrige "permission denied for table perfis" ao criar usuário: a função do servidor (service_role) precisa de permissão na tabela.
grant select, insert, update, delete on public.perfis to service_role;
grant select, insert, update, delete on public.matriculas to service_role;
notify pgrst, 'reload schema';
