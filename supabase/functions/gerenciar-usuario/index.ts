// Edge Function: gerenciar-usuario (só administrador)
// acoes: "criar" {email, senha, papel} | "excluir" {id} | "nova_senha" {id, senha}
// Nunca exclui nem altera a senha do administrador principal (perfis.protegido) e nunca exclui a si mesmo.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAPEIS = ["admin", "secretaria", "financeiro", "treinador", "comunicacao", "atleta"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const quem = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      auth: { persistSession: false },
    });
    const { data: u } = await quem.auth.getUser();
    if (!u?.user) return json({ erro: "Sessão inválida. Entre de novo." }, 401);
    const adm = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: eu } = await adm.from("perfis").select("papel").eq("id", u.user.id).maybeSingle();
    if (eu?.papel !== "admin") return json({ erro: "Só o administrador gerencia usuários." }, 403);

    const b = await req.json().catch(() => ({}));
    const acao = String(b.acao ?? "");

    if (acao === "criar") {
      const email = String(b.email ?? "").trim().toLowerCase();
      const senha = String(b.senha ?? "");
      const papel = String(b.papel ?? "");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ erro: "E-mail inválido." }, 400);
      if (senha.length < 8) return json({ erro: "A senha precisa ter 8 ou mais caracteres." }, 400);
      if (!PAPEIS.includes(papel)) return json({ erro: "Perfil inválido." }, 400);
      const { data, error } = await adm.auth.admin.createUser({ email, password: senha, email_confirm: true });
      if (error || !data.user) return json({ erro: error?.message ?? "Não foi possível criar." }, 400);
      const { error: e2 } = await adm.from("perfis").upsert({ id: data.user.id, papel });
      if (e2) { await adm.auth.admin.deleteUser(data.user.id); return json({ erro: e2.message }, 500); }
      return json({ id: data.user.id, email, papel });
    }

    const id = String(b.id ?? "");
    if (!UUID.test(id)) return json({ erro: "Usuário inválido." }, 400);
    const { data: alvo } = await adm.from("perfis").select("id,protegido").eq("id", id).maybeSingle();
    if (!alvo) return json({ erro: "Usuário não encontrado." }, 404);

    if (acao === "excluir") {
      if (alvo.protegido) return json({ erro: "O administrador principal não pode ser excluído." }, 403);
      if (id === u.user.id) return json({ erro: "Você não pode excluir a sua própria conta." }, 403);
      const { error } = await adm.auth.admin.deleteUser(id);
      return error ? json({ erro: error.message }, 500) : json({ ok: true });
    }
    if (acao === "nova_senha") {
      const senha = String(b.senha ?? "");
      if (senha.length < 8) return json({ erro: "A senha precisa ter 8 ou mais caracteres." }, 400);
      if (alvo.protegido && id !== u.user.id) return json({ erro: "A senha do administrador principal só ele mesmo altera." }, 403);
      const { error } = await adm.auth.admin.updateUserById(id, { password: senha });
      return error ? json({ erro: error.message }, 500) : json({ ok: true });
    }
    return json({ erro: "Ação inválida." }, 400);
  } catch (e) {
    return json({ erro: String((e as Error)?.message ?? e) }, 500);
  }
});
