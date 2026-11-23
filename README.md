# Instituto DF e Entorno (IDE) – site e painel

Site em HTML único (`index.html`) ligado ao Supabase (login, banco de dados e arquivos).

## Arquivos
- `index.html`: site público, matrícula, Área do atleta e Painel ADM.
- `config.js`: URL e chave **publishable** do Supabase. Nunca coloque aqui a chave `secret` ou `service_role`.
- `supabase-schema.sql`: tabelas, regras de segurança (RLS) e armazenamento. Rodar primeiro.
- `supabase/sql/04..06`: avisos, treinos, galeria, eventos, contas de atletas e auditoria. Rodar em ordem, depois do schema.

## Configuração
1. Supabase > SQL Editor: rodar `supabase-schema.sql` e depois os arquivos de `supabase/sql/` em ordem (04, 05, 06).
2. Supabase > Authentication: ligar e-mail e senha; em URL Configuration, colocar o endereço do site em Site URL.
3. Colar a Publishable Key em `config.js`.
4. Publicar no GitHub Pages: Settings > Pages > Branch `main`, pasta `/ (root)`.
5. Criar a conta de administrador pelo site e rodar no SQL Editor:
   `update public.perfis set papel='admin' where id=(select id from auth.users where email='SEU_EMAIL');`

## Papéis
admin, secretaria, financeiro, treinador, comunicacao, atleta (padrão de todo cadastro novo).

## Pendências conhecidas

- Pix com confirmação manual. Confirmação automática exige gateway (Asaas, Mercado Pago ou Pagar.me) e função no servidor.
- Falta política de privacidade e termos revisados por profissional (o sistema guarda dados de menores).

## Atualização do banco
Rode `supabase/sql/ATUALIZAR-SUPABASE.sql` (junta 04 a 07) no SQL Editor. Se já rodou e apareceu "permission denied", rode só `08-so-permissoes.sql`.

## Arquivos do site
`index.html` (páginas), `style.css`, `app.js` (lógica), `img/` (fotos e logo).
Entradas e saídas, Pagamentos, Sócios, Loja, Transparência e Usuários agora ficam no banco. Textos de privacidade e termos são modelo: revisar com advogado.
