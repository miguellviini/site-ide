-- IDE · textos fixos do site editáveis pelo painel (menu "Textos do site"). Rode DEPOIS do 09. Pode rodar mais de uma vez.
create table if not exists public.site_textos (
  chave text primary key, texto text not null, atualizado timestamptz default now()
);
alter table public.site_textos enable row level security;
drop policy if exists "pub textos" on public.site_textos;
create policy "pub textos" on public.site_textos for select using (true);
drop policy if exists "esc textos" on public.site_textos;
create policy "esc textos" on public.site_textos for all using (public.tem_papel(array['admin','comunicacao'])) with check (public.tem_papel(array['admin','comunicacao']));
grant select on public.site_textos to anon, authenticated;
grant insert, update, delete on public.site_textos to authenticated;
drop trigger if exists audita on public.site_textos;
create trigger audita after insert or update or delete on public.site_textos for each row execute function public.registra_auditoria();
notify pgrst, 'reload schema';
