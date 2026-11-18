// Edge Function: aprovar-matricula
// - acao "aprovar": cria a CONTA PRÓPRIA do atleta (login + senha) e marca a matrícula como Aprovada.
// - acao "nova_senha": gera nova senha para a conta do atleta que já existe.
// Nunca altera a conta do responsável (matriculas.dono). Só admin e secretaria podem chamar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const DOMINIO = "ide-atletas.com.br"; // igual a LOGIN_DOMINIO no index.html
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const palavras = (n: string) =>
  n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z\s]/g, " ").trim().split(/\s+/).filter(Boolean);

function senhaAleatoria(n = 10) {
  const c = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint32Array(n)), (x) => c[x % c.length]).join("");
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1) quem está chamando? precisa ser admin ou secretaria
    const quem = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      auth: { persistSession: false },
    });
    const { data: u } = await quem.auth.getUser();
    if (!u?.user) return json({ erro: "Sessão inválida. Entre de novo no painel." }, 401);
    const adm = createClient(url, service, { auth: { persistSession: false } });
    const { data: perfil } = await adm.from("perfis").select("papel").eq("id", u.user.id).maybeSingle();
    if (!perfil || !["admin", "secretaria"].includes(perfil.papel)) return json({ erro: "Sem permissão." }, 403);

    // 2) pedido
    const body = await req.json().catch(() => ({}));
    const matriculaId = String(body.matricula_id ?? "");
    const acao = body.acao === "nova_senha" ? "nova_senha" : "aprovar";
    if (!UUID.test(matriculaId)) return json({ erro: "Matrícula inválida." }, 400);

    const { data: m } = await adm.from("matriculas")
      .select("id,dono,nome,status,login,atleta_user").eq("id", matriculaId).maybeSingle();
    if (!m) return json({ erro: "Matrícula não encontrada." }, 404);
    if (m.atleta_user && m.atleta_user === m.dono) return json({ erro: "Conta do atleta igual à do responsável. Fale com o suporte." }, 409);

    const agora = new Date().toISOString();
    let login: string | null = m.login ?? null;
    let senha: string | null = null;

    if (acao === "nova_senha") {
      if (m.status !== "Aprovada") return json({ erro: "A matrícula não está Aprovada." }, 400);
      if (!m.atleta_user) return json({ erro: "O atleta ainda não tem conta. Use Gerar login e senha." }, 400);
      senha = senhaAleatoria();
      const { error } = await adm.auth.admin.updateUserById(m.atleta_user, { password: senha });
      if (error) return json({ erro: error.message }, 500);
    } else if (!m.atleta_user) {
      // cria uma conta NOVA e separada para o atleta
      senha = senhaAleatoria();
      const p = palavras(m.nome);
      const base = p.length > 1 ? `${p[0]}.${p[p.length - 1]}` : (p[0] ?? "atleta");
      let novoId: string | null = null;
      for (let i = 0; i < 10 && !novoId; i++) {
        const n = i < 5 ? Math.floor(Math.random() * 90) + 10 : Math.floor(Math.random() * 900) + 100;
        const tent = `${base}${n}`;
        const { data, error } = await adm.auth.admin.createUser({
          email: `${tent}@${DOMINIO}`, password: senha, email_confirm: true,
          user_metadata: { tipo: "atleta", matricula_id: m.id },
        });
        if (!error && data.user) { novoId = data.user.id; login = tent; break; }
        if (!(error && (error.code === "email_exists" || /already|registered|exists|duplicate/i.test(error.message)))) {
          return json({ erro: error?.message ?? "Erro ao criar a conta do atleta." }, 500);
        }
      }
      if (!novoId || !login) return json({ erro: "Não consegui gerar um login único. Tente de novo." }, 500);

      // liga a conta à matrícula; se falhar, desfaz a conta criada
      const { data: lig, error: e2 } = await adm.from("matriculas")
        .update({ atleta_user: novoId, login, status: "Aprovada", atualizado: agora, decidido_por: u.user.id, decidido_em: agora })
        .eq("id", m.id).is("atleta_user", null).select("id");
      if (e2 || !lig || lig.length === 0) {
        await adm.auth.admin.deleteUser(novoId);
        return json({ erro: e2?.message ?? "Essa matrícula já recebeu uma conta. Atualize a página." }, 409);
      }
    } else if (m.status !== "Aprovada") {
      // conta já existe (aprovação refeita): só volta o status, sem trocar a senha
      const { error } = await adm.from("matriculas").update({ status: "Aprovada", atualizado: agora, decidido_por: u.user.id, decidido_em: agora }).eq("id", m.id);
      if (error) return json({ erro: error.message }, 500);
    }

    // 3) teste: se geramos senha, o login realmente entra?
    if (senha && login) {
      const teste = createClient(url, anon, { auth: { persistSession: false } });
      const { error: e3 } = await teste.auth.signInWithPassword({ email: `${login}@${DOMINIO}`, password: senha });
      if (e3) return json({ erro: "A conta foi criada, mas o teste de entrada falhou: " + e3.message }, 500);
    }
    return json({ matricula_id: m.id, login, senha });
  } catch (e) {
    return json({ erro: String((e as Error)?.message ?? e) }, 500);
  }
});
