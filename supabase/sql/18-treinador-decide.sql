-- IDE · o treinador (comissão técnica) pode aceitar ou recusar matrículas, mas só mexer no status.
-- Rode DEPOIS do 17. Pode rodar mais de uma vez.
drop policy if exists "matricula: treinador decide" on public.matriculas;
create policy "matricula: treinador decide" on public.matriculas for update
  using (public.tem_papel(array['treinador'])) with check (public.tem_papel(array['treinador']));

create or replace function public.limita_treinador()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated','anon') and public.tem_papel(array['treinador'])
     and not public.tem_papel(array['admin','secretaria'])
     and (to_jsonb(new) - 'status' - 'atualizado' - 'decidido_por' - 'decidido_em')
         is distinct from (to_jsonb(old) - 'status' - 'atualizado' - 'decidido_por' - 'decidido_em') then
    raise exception 'O treinador só pode alterar o status da matrícula.';
  end if;
  return new;
end $$;
drop trigger if exists limita_treinador on public.matriculas;
create trigger limita_treinador before update on public.matriculas
  for each row execute function public.limita_treinador();
