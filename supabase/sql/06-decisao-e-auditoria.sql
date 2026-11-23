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
