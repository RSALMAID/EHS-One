/**
 * Lê as variáveis públicas do Supabase. Remove espaços colados por engano e
 * devolve null quando faltam ou são inválidas, para que o site não caia inteiro.
 *
 * Next.js só embute NEXT_PUBLIC_* quando o nome aparece por extenso no código,
 * por isso cada variável é lida diretamente.
 */
export function getSupabaseEnv(): { url: string; key: string } | null {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") return null;
  } catch {
    return null;
  }
  return { url: url.replace(/\/+$/, ""), key };
}

export const MISSING_ENV_MESSAGE =
  "Configuração do Supabase ausente ou inválida: confira NEXT_PUBLIC_SUPABASE_URL e " +
  "NEXT_PUBLIC_SUPABASE_ANON_KEY nas variáveis de ambiente e publique de novo.";

export function requireSupabaseEnv() {
  const env = getSupabaseEnv();
  if (!env) throw new Error(MISSING_ENV_MESSAGE);
  return env;
}
