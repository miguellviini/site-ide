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
