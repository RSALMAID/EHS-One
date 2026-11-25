/**
 * Lê as variáveis públicas do Supabase, corrige deslizes comuns de colagem
 * (espaços, aspas, falta de https://, barra ou /rest/v1 no fim) e diz o que
 * está errado quando não dá para usar.
 *
 * Next.js só embute NEXT_PUBLIC_* quando o nome aparece por extenso no código,
 * por isso cada variável é lida diretamente.
 */

export type SupabaseEnvCheck =
  | { ok: true; url: string; key: string }
  | { ok: false; problems: string[]; rawUrl: string; keyPreview: string };

function clean(value: string | undefined): string {
  return (value ?? "").trim().replace(/^["'`]+|["'`]+$/g, "").trim();
}

export function checkSupabaseEnv(): SupabaseEnvCheck {
  const rawUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const problems: string[] = [];

  let url = "";
  if (!rawUrl) {
    problems.push("NEXT_PUBLIC_SUPABASE_URL está vazia.");
  } else {
    const withProtocol = /^[a-z]+:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    try {
      const parsed = new URL(withProtocol);
      if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
        problems.push("NEXT_PUBLIC_SUPABASE_URL precisa começar com https://.");
      } else if (!parsed.hostname.includes(".")) {
        problems.push("NEXT_PUBLIC_SUPABASE_URL não parece um endereço (ex.: https://xxxx.supabase.co).");
      } else {
        url = parsed.origin;
      }
    } catch {
      problems.push("NEXT_PUBLIC_SUPABASE_URL não é um endereço válido (ex.: https://xxxx.supabase.co).");
    }
  }

  if (!key) {
    problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY está vazia.");
  } else if (/\s/.test(key)) {
    problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY tem espaço ou quebra de linha no meio.");
  } else if (key.startsWith("sb_secret_")) {
    problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY recebeu a chave SECRETA. Use a Publishable key (sb_publishable_…) ou a anon (eyJ…).");
  } else if (!key.startsWith("sb_publishable_") && !key.startsWith("eyJ")) {
    problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY não parece a chave pública (deveria começar com sb_publishable_ ou eyJ).");
  }

  if (problems.length) {
    const keyPreview = key ? `${key.slice(0, 15)}… (${key.length} caracteres)` : "(vazia)";
    return { ok: false, problems, rawUrl, keyPreview };
  }
  return { ok: true, url, key };
}

export function getSupabaseEnv(): { url: string; key: string } | null {
  const check = checkSupabaseEnv();
  return check.ok ? { url: check.url, key: check.key } : null;
}

export const MISSING_ENV_MESSAGE =
  "Configuração do Supabase ausente ou inválida: abra /configuracao para ver o que corrigir.";

export function requireSupabaseEnv() {
  const env = getSupabaseEnv();
  if (!env) throw new Error(MISSING_ENV_MESSAGE);
  return env;
}
