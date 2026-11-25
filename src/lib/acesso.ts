/**
 * Trava de acesso por código, para o período antes do lançamento.
 * Ligada quando a variável CODIGO_ACESSO existe na Vercel; sem ela o site fica
 * aberto. O cookie guarda só o hash do código, então trocar o código na Vercel
 * desloga todo mundo da trava.
 */
export const ACESSO_COOKIE = "ehs_acesso";

export function codigoAcesso(): string | null {
  const codigo = (process.env.CODIGO_ACESSO ?? "").trim();
  return codigo || null;
}

export async function hashCodigo(codigo: string): Promise<string> {
  const bytes = new TextEncoder().encode(`ehs-one:${codigo.trim()}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Caminhos que ficam abertos mesmo com a trava ligada. */
export function caminhoLivre(path: string): boolean {
  return path === "/acesso" || path === "/configuracao";
}
