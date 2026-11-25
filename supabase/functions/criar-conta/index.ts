// Edge Function: criar-conta (pública)
// Cria a conta do responsável durante a matrícula, já confirmada (sem e-mail de confirmação).
// O perfil nasce sempre como "atleta" (gatilho do banco): essa conta nunca acessa o painel.
// Deploy: deixe "Enforce JWT verification" DESLIGADO (o site chama sem login).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const b = await req.json().catch(() => ({}));
    const email = String(b.email ?? "").trim().toLowerCase();
    const senha = String(b.senha ?? "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) return json({ erro: "E-mail inválido." }, 400);
    if (senha.length < 8 || senha.length > 72) return json({ erro: "A senha precisa ter de 8 a 72 caracteres." }, 400);
    const adm = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { error } = await adm.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { tipo: "responsavel" } });
    if (error) {
      if (error.code === "email_exists" || /already|registered|exists|duplicate/i.test(error.message)) return json({ erro: "existe" }, 409);
      return json({ erro: error.message }, 400);
    }
    return json({ ok: true });
  } catch (e) {
    return json({ erro: String((e as Error)?.message ?? e) }, 500);
  }
});
