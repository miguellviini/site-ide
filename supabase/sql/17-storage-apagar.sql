-- IDE · permite APAGAR arquivos do armazenamento (fotos de itens excluídos/trocados e documentos de matrículas excluídas).
-- Sem isso o site "exclui" mas o arquivo continua guardado. Rode DEPOIS do 16. Pode rodar mais de uma vez.
drop policy if exists "publico: equipe apaga" on storage.objects;
create policy "publico: equipe apaga" on storage.objects for delete using (
  bucket_id = 'publico' and public.tem_papel(array['admin','comunicacao','secretaria','treinador']));
drop policy if exists "docs: admin apaga" on storage.objects;
create policy "docs: admin apaga" on storage.objects for delete using (
  bucket_id = 'documentos' and public.eh_admin());
