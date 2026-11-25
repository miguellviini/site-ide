-- IDE · "Esqueci a senha" sem e-mail: a pessoa deixa um pedido, o administrador define a nova senha no painel.
-- Rode DEPOIS do 19. Pode rodar mais de uma vez.
create table if not exists public.pedidos_senha (
  id uuid primary key default gen_random_uuid(),
  identificador text not null check (char_length(identificador) between 3 and 120),
  whatsapp text not null check (char_length(whatsapp) between 10 and 20),
  status text not null default 'pendente' check (status in ('pendente','resolvido')),
  criado timestamptz not null default now(),
  resolvido_em timestamptz
);
-- um pedido pendente por pessoa (evita repetir o mesmo pedido várias vezes)
create unique index if not exists pedidos_senha_pendente_uk on public.pedidos_senha (lower(identificador)) where status = 'pendente';
alter table public.pedidos_senha enable row level security;

drop policy if exists "pedido senha: qualquer um cria" on public.pedidos_senha;
create policy "pedido senha: qualquer um cria" on public.pedidos_senha for insert to anon, authenticated
  with check (status = 'pendente' and resolvido_em is null);
drop policy if exists "pedido senha: admin gerencia" on public.pedidos_senha;
create policy "pedido senha: admin gerencia" on public.pedidos_senha for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

grant insert on public.pedidos_senha to anon, authenticated;
grant select, update, delete on public.pedidos_senha to authenticated;

drop trigger if exists audita on public.pedidos_senha;
create trigger audita after insert or update or delete on public.pedidos_senha for each row execute function public.registra_auditoria();
notify pgrst, 'reload schema';
