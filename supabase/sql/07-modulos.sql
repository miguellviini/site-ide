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
