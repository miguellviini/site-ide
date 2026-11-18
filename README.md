# Instituto DF e Entorno (IDE) – site e painel

Site em HTML único (`index.html`) ligado ao Supabase (login, banco de dados e arquivos).

## Arquivos
- `index.html`: site público, matrícula, Área do atleta e Painel ADM.
- `config.js`: URL e chave **publishable** do Supabase. Nunca coloque aqui a chave `secret` ou `service_role`.
- `supabase-schema.sql`: tabelas, regras de segurança (RLS) e armazenamento. Rodar primeiro.
- `supabase-addendum.sql`: tabelas de avisos, treinos e galeria. Rodar depois.

## Configuração
1. Supabase > SQL Editor: rodar `supabase-schema.sql` e depois `supabase-addendum.sql`.
2. Supabase > Authentication: ligar e-mail e senha; em URL Configuration, colocar o endereço do site em Site URL.
3. Colar a Publishable Key em `config.js`.
4. Publicar no GitHub Pages: Settings > Pages > Branch `main`, pasta `/ (root)`.
5. Criar a conta de administrador pelo site e rodar no SQL Editor:
   `update public.perfis set papel='admin' where id=(select id from auth.users where email='SEU_EMAIL');`

## Papéis
admin, secretaria, financeiro, treinador, comunicacao, atleta (padrão de todo cadastro novo).

## Pendências conhecidas
- Entradas e saídas e a configuração de Pagamentos ainda ficam só no aparelho (falta ligar ao banco).
- Pix com confirmação manual. Confirmação automática exige gateway (Asaas, Mercado Pago ou Pagar.me) e função no servidor.
- Falta política de privacidade e termos revisados por profissional (o sistema guarda dados de menores).
