-- IDE · permite arquivar matrículas (em vez de excluir). Rode DEPOIS do 09. Pode rodar mais de uma vez.
alter table public.matriculas drop constraint if exists matriculas_status_check;
alter table public.matriculas add constraint matriculas_status_check
  check (status in ('Recebida','Em análise','Aguardando documentos','Aprovada','Recusada','Arquivada'));
