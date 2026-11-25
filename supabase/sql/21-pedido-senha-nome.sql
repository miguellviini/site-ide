-- IDE · o pedido de senha passa a guardar o nome da pessoa (para o admin conferir com a matrícula). Rode DEPOIS do 20.
alter table public.pedidos_senha add column if not exists nome text check (nome is null or char_length(nome) between 3 and 120);
notify pgrst, 'reload schema';
