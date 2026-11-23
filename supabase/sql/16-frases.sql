-- IDE · frases do carrossel editáveis no painel (menu "Frases do carrossel"). Rode DEPOIS do 15. Pode rodar mais de uma vez.
create table if not exists public.frases (
  id uuid primary key default gen_random_uuid(),
  texto text not null, publicado boolean not null default true, criado timestamptz default now()
);
alter table public.frases enable row level security;
drop policy if exists "pub frases" on public.frases;
create policy "pub frases" on public.frases for select using (publicado or public.tem_papel(array['admin','comunicacao']));
drop policy if exists "esc frases" on public.frases;
create policy "esc frases" on public.frases for all using (public.tem_papel(array['admin','comunicacao'])) with check (public.tem_papel(array['admin','comunicacao']));
grant select on public.frases to anon, authenticated;
grant insert, update, delete on public.frases to authenticated;
drop trigger if exists audita on public.frases;
create trigger audita after insert or update or delete on public.frases for each row execute function public.registra_auditoria();
notify pgrst, 'reload schema';
