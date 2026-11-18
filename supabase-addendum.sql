-- IDE · complemento do esquema: avisos, treinos e galeria
-- Rode DEPOIS do supabase-schema.sql. Pode rodar mais de uma vez. Não apaga dados.

create table if not exists public.avisos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null, texto text, publicado boolean not null default false,
  criado timestamptz default now()
);
create table if not exists public.treinos (
  id uuid primary key default gen_random_uuid(),
  dia text not null, categoria text, horario text, local text, obs text,
  publicado boolean not null default false
);
create table if not exists public.galeria (
  id uuid primary key default gen_random_uuid(),
  legenda text, foto_path text not null, publicado boolean not null default false,
  criado timestamptz default now()
);
alter table public.avisos enable row level security;
alter table public.treinos enable row level security;
alter table public.galeria enable row level security;

drop policy if exists "pub avisos" on public.avisos;
create policy "pub avisos" on public.avisos for select using (publicado or public.tem_papel(array['admin','comunicacao']));
drop policy if exists "esc avisos" on public.avisos;
create policy "esc avisos" on public.avisos for all using (public.tem_papel(array['admin','comunicacao'])) with check (public.tem_papel(array['admin','comunicacao']));

drop policy if exists "pub treinos" on public.treinos;
create policy "pub treinos" on public.treinos for select using (publicado or public.tem_papel(array['admin','treinador']));
drop policy if exists "esc treinos" on public.treinos;
create policy "esc treinos" on public.treinos for all using (public.tem_papel(array['admin','treinador'])) with check (public.tem_papel(array['admin','treinador']));

drop policy if exists "pub galeria" on public.galeria;
create policy "pub galeria" on public.galeria for select using (publicado or public.tem_papel(array['admin','comunicacao']));
drop policy if exists "esc galeria" on public.galeria;
create policy "esc galeria" on public.galeria for all using (public.tem_papel(array['admin','comunicacao'])) with check (public.tem_papel(array['admin','comunicacao']));

-- quem pode enviar fotos para o bucket público (atletas, comissão, notícias, galeria, logos)
drop policy if exists "publico: equipe envia" on storage.objects;
create policy "publico: equipe envia" on storage.objects for insert with check (
  bucket_id = 'publico' and public.tem_papel(array['admin','comunicacao','secretaria','treinador']));
