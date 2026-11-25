-- IDE · o responsável pode reenviar foto/documentos da matrícula pelo site (em Minha matrícula).
-- Só mexe em foto_path, docs_paths e (de "Aguardando documentos" para "Em análise"). Rode DEPOIS do 18. Pode rodar mais de uma vez.
drop policy if exists "matricula: dono envia documentos" on public.matriculas;
create policy "matricula: dono envia documentos" on public.matriculas for update
  using (dono = auth.uid() and status in ('Recebida','Em análise','Aguardando documentos'))
  with check (dono = auth.uid());

create or replace function public.limita_dono()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated','anon') and old.dono = auth.uid()
     and not public.tem_papel(array['admin','secretaria','treinador']) then
    if (to_jsonb(new) - 'foto_path' - 'docs_paths' - 'status' - 'atualizado')
       is distinct from (to_jsonb(old) - 'foto_path' - 'docs_paths' - 'status' - 'atualizado') then
      raise exception 'Você só pode reenviar a foto e os documentos.';
    end if;
    if new.status is distinct from old.status
       and not (old.status = 'Aguardando documentos' and new.status = 'Em análise') then
      raise exception 'Só a equipe altera o status da matrícula.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists limita_dono on public.matriculas;
create trigger limita_dono before update on public.matriculas
  for each row execute function public.limita_dono();
