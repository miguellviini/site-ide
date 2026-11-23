-- IDE · corrige o log de auditoria para tabelas sem coluna "id" (ex.: site_textos). Rode DEPOIS do 14. Pode rodar mais de uma vez.
create or replace function public.registra_auditoria()
returns trigger language plpgsql security definer set search_path = public as $$
declare a jsonb; d jsonb; rid text;
begin
  rid := coalesce(to_jsonb(coalesce(new, old))->>'id', to_jsonb(coalesce(new, old))->>'chave');
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
