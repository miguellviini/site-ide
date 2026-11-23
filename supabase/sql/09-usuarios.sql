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
