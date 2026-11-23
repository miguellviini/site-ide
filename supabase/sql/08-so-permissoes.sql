-- Rode este arquivo se você já rodou o ATUALIZAR anterior e deu "permission denied for table eventos".
grant select on public.eventos, public.loja_produtos, public.transparencia_docs to anon, authenticated;
grant insert, update, delete on public.eventos, public.loja_produtos, public.transparencia_docs to authenticated;
grant select, insert, update, delete on public.socios, public.lancamentos to authenticated;
