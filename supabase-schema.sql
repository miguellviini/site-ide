-- IDE · Instituto DF e Entorno · esquema do Supabase
-- Pode ser executado mais de uma vez. Não apaga dados existentes.
-- Rode no SQL Editor: New query > colar tudo > Run.

-- 1) PERFIS E PAPÉIS -------------------------------------------------
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  papel text not null default 'atleta'
    check (papel in ('admin','secretaria','financeiro','treinador','comunicacao','atleta')),
  criado timestamptz default now()
);
alter table public.perfis enable row level security;

create or replace function public.tem_papel(p text[])
returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from public.perfis where id = auth.uid() and papel = any(p)) $$;

create or replace function public.eh_admin()
returns boolean language sql stable security definer set search_path = public as
$$ select public.tem_papel(array['admin']) $$;

-- todo cadastro novo vira "atleta"; ninguém se promove sozinho
create or replace function public.novo_usuario()
returns trigger language plpgsql security definer set search_path = public as
$$ begin
  insert into public.perfis(id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.novo_usuario();

drop policy if exists "perfil: ve o proprio" on public.perfis;
create policy "perfil: ve o proprio" on public.perfis for select
  using (id = auth.uid() or public.eh_admin());
drop policy if exists "perfil: admin altera" on public.perfis;
create policy "perfil: admin altera" on public.perfis for update
  using (public.eh_admin()) with check (public.eh_admin());

-- 2) MATRÍCULAS --------------------------------------------------------
create table if not exists public.matriculas (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null references auth.users(id) default auth.uid(),
  protocolo text unique not null,
  status text not null default 'Recebida'
    check (status in ('Recebida','Em análise','Aguardando documentos','Aprovada','Recusada')),
  nome text not null, nascimento date not null,
  rg text, cpf text, cep text,
  responsavel text, whatsapp text, email text,
  pai jsonb, mae jsonb,
  categoria text, posicao text, clube_anterior text,
  foto_path text, docs_paths jsonb,
  consentimento boolean not null, uso_imagem boolean default false,
  criado timestamptz default now(), atualizado timestamptz default now()
);
alter table public.matriculas enable row level security;

drop policy if exists "atleta ve a sua" on public.matriculas;
drop policy if exists "atleta cria a sua" on public.matriculas;
drop policy if exists "admin atualiza" on public.matriculas;
create policy "matricula: dono ou equipe le" on public.matriculas for select
  using (dono = auth.uid() or public.tem_papel(array['admin','secretaria','treinador']));
create policy "matricula: dono cria" on public.matriculas for insert
  with check (dono = auth.uid() and status = 'Recebida' and consentimento);
create policy "matricula: secretaria altera" on public.matriculas for update
  using (public.tem_papel(array['admin','secretaria']));
create policy "matricula: admin exclui" on public.matriculas for delete
  using (public.eh_admin());

-- 3) CATEGORIAS, ATLETAS (ELENCO), COMISSÃO ----------------------------
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique, ativa boolean not null default false,
  treinador text, local_treino text, horarios text
);
create table if not exists public.atletas (
  id uuid primary key default gen_random_uuid(),
  matricula_id uuid references public.matriculas(id) on delete set null,
  categoria_id uuid references public.categorias(id),
  nome_publico text not null, camisa int, posicao text,
  foto_path text, estatisticas jsonb,
  publicado boolean not null default false  -- só com autorização do responsável
);
create table if not exists public.comissao (
  id uuid primary key default gen_random_uuid(),
  nome text not null, funcao text, categoria_id uuid references public.categorias(id),
  foto_path text, publicado boolean not null default true
);

-- 4) JOGOS, NOTÍCIAS, PATROCINADORES -----------------------------------
create table if not exists public.jogos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid references public.categorias(id),
  adversario text not null, data_hora timestamptz not null,
  local text, competicao text, placar_ide int, placar_adv int, publicado boolean default true
);
create table if not exists public.noticias (
  id uuid primary key default gen_random_uuid(),
  titulo text not null, texto text not null, categoria text,
  foto_path text, publicado boolean not null default false,
  criado timestamptz default now()
);
create table if not exists public.patrocinadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null, nivel text check (nivel in ('master','oficial','institucional','apoiador')),
  descricao text, link text, logo_path text, publicado boolean default true
);

-- 5) FINANCEIRO --------------------------------------------------------
create table if not exists public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('entrada','saida')),
  descricao text not null, valor numeric(12,2) not null check (valor > 0),
  data date not null, criado_por uuid default auth.uid(), criado timestamptz default now()
);
create table if not exists public.config_pagamentos (
  id int primary key default 1 check (id = 1),
  chave text default '', nome text default 'Instituto DF e Entorno',
  cidade text default '', whats text default '',
  itens jsonb not null default '[]'::jsonb
);
insert into public.config_pagamentos(id) values (1) on conflict do nothing;

-- 6) RLS EM TUDO + POLÍTICAS -------------------------------------------
do $$ declare t text; begin
  foreach t in array array['categorias','atletas','comissao','jogos','noticias','patrocinadores','lancamentos','config_pagamentos']
  loop execute format('alter table public.%I enable row level security', t); end loop;
end $$;

-- leitura pública só do que está publicado
drop policy if exists "pub categorias" on public.categorias;
create policy "pub categorias" on public.categorias for select using (ativa or public.tem_papel(array['admin','secretaria','treinador']));
drop policy if exists "pub atletas" on public.atletas;
create policy "pub atletas" on public.atletas for select using (publicado or public.tem_papel(array['admin','secretaria','treinador']));
drop policy if exists "pub comissao" on public.comissao;
create policy "pub comissao" on public.comissao for select using (publicado or public.tem_papel(array['admin','secretaria','treinador']));
drop policy if exists "pub jogos" on public.jogos;
create policy "pub jogos" on public.jogos for select using (publicado or public.tem_papel(array['admin','treinador']));
drop policy if exists "pub noticias" on public.noticias;
create policy "pub noticias" on public.noticias for select using (publicado or public.tem_papel(array['admin','comunicacao']));
drop policy if exists "pub patrocinadores" on public.patrocinadores;
create policy "pub patrocinadores" on public.patrocinadores for select using (publicado or public.tem_papel(array['admin','comunicacao']));
drop policy if exists "pub pagamentos" on public.config_pagamentos;
create policy "pub pagamentos" on public.config_pagamentos for select using (true);

-- escrita por papel
drop policy if exists "esc categorias" on public.categorias;
create policy "esc categorias" on public.categorias for all using (public.tem_papel(array['admin','secretaria'])) with check (public.tem_papel(array['admin','secretaria']));
drop policy if exists "esc atletas" on public.atletas;
create policy "esc atletas" on public.atletas for all using (public.tem_papel(array['admin','secretaria','treinador'])) with check (public.tem_papel(array['admin','secretaria','treinador']));
drop policy if exists "esc comissao" on public.comissao;
create policy "esc comissao" on public.comissao for all using (public.tem_papel(array['admin','secretaria'])) with check (public.tem_papel(array['admin','secretaria']));
drop policy if exists "esc jogos" on public.jogos;
create policy "esc jogos" on public.jogos for all using (public.tem_papel(array['admin','treinador'])) with check (public.tem_papel(array['admin','treinador']));
drop policy if exists "esc noticias" on public.noticias;
create policy "esc noticias" on public.noticias for all using (public.tem_papel(array['admin','comunicacao'])) with check (public.tem_papel(array['admin','comunicacao']));
drop policy if exists "esc patrocinadores" on public.patrocinadores;
create policy "esc patrocinadores" on public.patrocinadores for all using (public.tem_papel(array['admin','comunicacao'])) with check (public.tem_papel(array['admin','comunicacao']));
drop policy if exists "esc lancamentos" on public.lancamentos;
create policy "esc lancamentos" on public.lancamentos for all using (public.tem_papel(array['admin','financeiro'])) with check (public.tem_papel(array['admin','financeiro']));
drop policy if exists "esc pagamentos" on public.config_pagamentos;
create policy "esc pagamentos" on public.config_pagamentos for update using (public.tem_papel(array['admin','financeiro'])) with check (public.tem_papel(array['admin','financeiro']));

-- 7) ARMAZENAMENTO -----------------------------------------------------
-- documentos: PRIVADO, pasta = id do usuário (foto, certidão, comprovantes)
-- publico: logos, fotos de notícias e galeria
insert into storage.buckets (id, name, public) values ('documentos','documentos',false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('publico','publico',true) on conflict do nothing;

drop policy if exists "docs: dono ou admin le" on storage.objects;
drop policy if exists "docs: dono envia" on storage.objects;
drop policy if exists "docs: le" on storage.objects;
drop policy if exists "docs: envia" on storage.objects;
drop policy if exists "docs: troca" on storage.objects;
create policy "docs: le" on storage.objects for select using (
  bucket_id = 'documentos' and ((storage.foldername(name))[1] = auth.uid()::text
  or public.tem_papel(array['admin','secretaria','treinador'])));
create policy "docs: envia" on storage.objects for insert with check (
  bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "docs: troca" on storage.objects for update using (
  bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "publico: le" on storage.objects;
drop policy if exists "publico: equipe envia" on storage.objects;
create policy "publico: le" on storage.objects for select using (bucket_id = 'publico');
create policy "publico: equipe envia" on storage.objects for insert with check (
  bucket_id = 'publico' and public.tem_papel(array['admin','comunicacao']));

-- 8) PRIMEIRO ADMINISTRADOR (rode DEPOIS de criar a conta pelo site) ----
-- update public.perfis set papel = 'admin'
--   where id = (select id from auth.users where email = 'SEU_EMAIL_AQUI');
