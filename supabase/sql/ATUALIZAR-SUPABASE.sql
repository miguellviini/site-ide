-- IDE: ATUALIZACAO COMPLETA. Cole tudo no SQL Editor do Supabase e clique Run. Pode rodar mais de uma vez.

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

-- eventos (agenda pública)
create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null, data_hora timestamptz, local text, descricao text,
  publicado boolean not null default false, criado timestamptz default now()
);
alter table public.eventos enable row level security;
drop policy if exists "pub eventos" on public.eventos;
create policy "pub eventos" on public.eventos for select using (publicado or public.tem_papel(array['admin','comunicacao']));
drop policy if exists "esc eventos" on public.eventos;
create policy "esc eventos" on public.eventos for all using (public.tem_papel(array['admin','comunicacao'])) with check (public.tem_papel(array['admin','comunicacao']));

-- IDE · contas próprias dos atletas (login + senha gerados na aprovação)
-- Rode DEPOIS do supabase-schema.sql e do complemento. Pode rodar mais de uma vez. Não apaga dados.

-- 1) colunas novas: conta do atleta e login
alter table public.matriculas add column if not exists login text;
alter table public.matriculas add column if not exists atleta_user uuid references auth.users(id) on delete set null;
create unique index if not exists matriculas_atleta_user_uk on public.matriculas(atleta_user) where atleta_user is not null;
create unique index if not exists matriculas_login_uk on public.matriculas(lower(login)) where login is not null;

-- 2) leitura: o responsável (dono) vê a matrícula; a conta do atleta vê só a dele, e só se estiver Aprovada
drop policy if exists "matricula: dono ou equipe le" on public.matriculas;
create policy "matricula: dono ou equipe le" on public.matriculas for select using (
  dono = auth.uid()
  or (atleta_user = auth.uid() and status = 'Aprovada')
  or public.tem_papel(array['admin','secretaria','treinador'])
);

-- 3) criação: o responsável não pode preencher login nem conta do atleta
drop policy if exists "matricula: dono cria" on public.matriculas;
create policy "matricula: dono cria" on public.matriculas for insert
  with check (dono = auth.uid() and status = 'Recebida' and consentimento
              and login is null and atleta_user is null);

-- 4) proteção: pelo site (usuário logado) ninguém troca dono, atleta_user ou login; só a função do servidor
create or replace function public.protege_matricula()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated','anon') and (
       new.dono is distinct from old.dono
    or new.atleta_user is distinct from old.atleta_user
    or new.login is distinct from old.login) then
    raise exception 'Campo protegido: só a função aprovar-matricula altera dono, atleta_user e login.';
  end if;
  return new;
end $$;
drop trigger if exists protege_matricula on public.matriculas;
create trigger protege_matricula before update on public.matriculas
  for each row execute function public.protege_matricula();

-- 5) armazenamento: a conta do atleta aprovado pode ver SÓ a foto dele (a pasta é a do responsável)
drop policy if exists "docs: atleta le a foto" on storage.objects;
create policy "docs: atleta le a foto" on storage.objects for select using (
  bucket_id = 'documentos' and exists (
    select 1 from public.matriculas m
    where m.atleta_user = auth.uid() and m.status = 'Aprovada' and m.foto_path = name));

-- 6) (opcional) conferir se a versão antiga da função mexeu em contas de responsáveis.
--    Se aparecer alguma linha, essa conta teve o e-mail trocado: recrie a matrícula de teste.
-- select id, email from auth.users where email like '%@ide-atletas.com.br';

-- IDE · registro de quem decidiu a matrícula + log de operações administrativas
-- Rode DEPOIS do 05-contas-atletas.sql. Pode rodar mais de uma vez. Não apaga dados.

alter table public.matriculas add column if not exists decidido_por uuid references auth.users(id) on delete set null;
alter table public.matriculas add column if not exists decidido_em timestamptz;

-- substitui a proteção: ninguém muda dono/atleta_user/login pelo site; decisão (quem e quando) é gravada sozinha
create or replace function public.protege_matricula()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated','anon') then
    if new.dono is distinct from old.dono or new.atleta_user is distinct from old.atleta_user
       or new.login is distinct from old.login then
      raise exception 'Campo protegido: só a função aprovar-matricula altera dono, atleta_user e login.';
    end if;
    new.decidido_por := old.decidido_por; new.decidido_em := old.decidido_em;
    if new.status is distinct from old.status and new.status in ('Aprovada','Recusada') then
      new.decidido_por := auth.uid(); new.decidido_em := now();
    end if;
  end if;
  return new;
end $$;

-- log de auditoria (só o admin lê; ninguém escreve pelo site)
create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  quando timestamptz not null default now(),
  usuario uuid, tabela text not null, operacao text not null, registro text,
  antes jsonb, depois jsonb
);
alter table public.auditoria enable row level security;
drop policy if exists "auditoria: admin le" on public.auditoria;
create policy "auditoria: admin le" on public.auditoria for select using (public.eh_admin());

create or replace function public.registra_auditoria()
returns trigger language plpgsql security definer set search_path = public as $$
declare a jsonb; d jsonb; rid text;
begin
  rid := case when tg_op = 'DELETE' then old.id::text else new.id::text end;
  if tg_table_name = 'matriculas' then  -- não guarda CPF/RG no log: só status e login
    a := case when tg_op <> 'INSERT' then jsonb_build_object('status', old.status, 'login', old.login) end;
    d := case when tg_op <> 'DELETE' then jsonb_build_object('status', new.status, 'login', new.login) end;
  else
    a := case when tg_op <> 'INSERT' then to_jsonb(old) end;
    d := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  end if;
  insert into public.auditoria(usuario, tabela, operacao, registro, antes, depois)
  values (auth.uid(), tg_table_name, tg_op, rid, a, d);
  return coalesce(new, old);
end $$;

do $$ declare t text; begin
  foreach t in array array['matriculas','categorias','atletas','comissao','jogos','noticias','patrocinadores','lancamentos','config_pagamentos','avisos','treinos','galeria','eventos','perfis']
  loop
    execute format('drop trigger if exists audita on public.%I', t);
    execute format('create trigger audita after insert or update or delete on public.%I for each row execute function public.registra_auditoria()', t);
  end loop;
end $$;

-- IDE · módulos do painel: sócios, loja, transparência, usuários. Rode DEPOIS do 06. Pode rodar mais de uma vez.

create table if not exists public.socios (
  id uuid primary key default gen_random_uuid(),
  nome text not null, contato text, plano text, valor numeric(12,2),
  status text not null default 'ativo', obs text, criado timestamptz default now()
);
create table if not exists public.loja_produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null, descricao text, preco numeric(12,2), foto_path text,
  publicado boolean not null default false, criado timestamptz default now()
);
create table if not exists public.transparencia_docs (
  id uuid primary key default gen_random_uuid(),
  titulo text not null, ano int, link text,
  publicado boolean not null default false, criado timestamptz default now()
);
alter table public.socios enable row level security;
alter table public.loja_produtos enable row level security;
alter table public.transparencia_docs enable row level security;

-- sócios: dados pessoais, nunca públicos
drop policy if exists "esc socios" on public.socios;
create policy "esc socios" on public.socios for all using (public.tem_papel(array['admin','financeiro','secretaria'])) with check (public.tem_papel(array['admin','financeiro','secretaria']));
-- loja e documentos: público lê o publicado
drop policy if exists "pub loja" on public.loja_produtos;
create policy "pub loja" on public.loja_produtos for select using (publicado or public.tem_papel(array['admin','comunicacao']));
drop policy if exists "esc loja" on public.loja_produtos;
create policy "esc loja" on public.loja_produtos for all using (public.tem_papel(array['admin','comunicacao'])) with check (public.tem_papel(array['admin','comunicacao']));
drop policy if exists "pub transp" on public.transparencia_docs;
create policy "pub transp" on public.transparencia_docs for select using (publicado or public.tem_papel(array['admin','financeiro']));
drop policy if exists "esc transp" on public.transparencia_docs;
create policy "esc transp" on public.transparencia_docs for all using (public.tem_papel(array['admin','financeiro'])) with check (public.tem_papel(array['admin','financeiro']));

-- totais públicos da transparência: só somas, nunca lançamentos individuais
create or replace function public.resumo_transparencia()
returns table(entradas numeric, saidas numeric) language sql stable security definer set search_path = public as
$$ select coalesce(sum(valor) filter (where tipo='entrada'),0), coalesce(sum(valor) filter (where tipo='saida'),0) from public.lancamentos $$;
grant execute on function public.resumo_transparencia() to anon, authenticated;

-- usuários (e-mail + papel), só para admin
create or replace function public.lista_usuarios()
returns table(id uuid, email text, papel text) language sql stable security definer set search_path = public as
$$ select p.id, u.email::text, p.papel from public.perfis p join auth.users u on u.id = p.id where public.eh_admin() order by u.email $$;
grant execute on function public.lista_usuarios() to authenticated;

-- auditoria nas tabelas novas
do $$ declare t text; begin
  foreach t in array array['socios','loja_produtos','transparencia_docs']
  loop
    execute format('drop trigger if exists audita on public.%I', t);
    execute format('create trigger audita after insert or update or delete on public.%I for each row execute function public.registra_auditoria()', t);
  end loop;
end $$;

-- permissões de tabela (o RLS acima continua decidindo quem lê e escreve de verdade)
grant select on public.eventos, public.loja_produtos, public.transparencia_docs to anon, authenticated;
grant insert, update, delete on public.eventos, public.loja_produtos, public.transparencia_docs to authenticated;
grant select, insert, update, delete on public.socios, public.lancamentos to authenticated;
-- IDE · usuários: protege o primeiro administrador. Rode DEPOIS do 07. Pode rodar mais de uma vez.

alter table public.perfis add column if not exists protegido boolean not null default false;
-- o primeiro admin (o mais antigo) fica protegido
update public.perfis set protegido = true
 where id = (select id from public.perfis where papel = 'admin' order by criado asc limit 1);

-- protegido: não pode ser excluído nem rebaixado; ninguém altera o próprio perfil nem a marca "protegido" pelo site
create or replace function public.protege_perfil()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.protegido then raise exception 'O administrador principal não pode ser excluído.'; end if;
    return old;
  end if;
  if old.protegido and new.papel <> 'admin' then raise exception 'O administrador principal não pode ser rebaixado.'; end if;
  if current_user in ('authenticated','anon') then
    if new.protegido is distinct from old.protegido then raise exception 'Campo protegido.'; end if;
    if old.id = auth.uid() and new.papel <> old.papel then raise exception 'Você não pode alterar o seu próprio perfil.'; end if;
  end if;
  return new;
end $$;
drop trigger if exists protege_perfil on public.perfis;
create trigger protege_perfil before update or delete on public.perfis
  for each row execute function public.protege_perfil();

drop function if exists public.lista_usuarios();
create function public.lista_usuarios()
returns table(id uuid, email text, papel text, protegido boolean, criado timestamptz) language sql stable security definer set search_path = public as
$$ select p.id, u.email::text, p.papel, p.protegido, p.criado from public.perfis p join auth.users u on u.id = p.id where public.eh_admin() order by p.criado $$;
grant execute on function public.lista_usuarios() to authenticated;

-- auditoria: o admin lê pelo site
grant select on public.auditoria to authenticated;
notify pgrst, 'reload schema';
