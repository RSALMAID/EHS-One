export const TIPOS_RISCO: Record<string, string> = {
  fisico: "Físico",
  quimico: "Químico",
  biologico: "Biológico",
  ergonomico: "Ergonômico",
  acidente: "Acidente / mecânico",
  psicossocial: "Psicossocial",
};

export const SEVERIDADE = ["", "1 · Leve", "2 · Baixa", "3 · Moderada", "4 · Grave", "5 · Gravíssima"];
export const PROBABILIDADE = ["", "1 · Rara", "2 · Improvável", "3 · Possível", "4 · Provável", "5 · Quase certa"];

/** Matriz 5×5: nível = severidade × probabilidade. */
export function classificar(nivel: number | null | undefined) {
  const n = nivel ?? 0;
  if (n >= 17) return { nome: "Crítico", cor: "bg-red-600 text-white" };
  if (n >= 10) return { nome: "Alto", cor: "bg-orange-500 text-white" };
  if (n >= 5) return { nome: "Moderado", cor: "bg-amber-300 text-slate-900" };
  return { nome: "Baixo", cor: "bg-emerald-200 text-slate-900" };
}

export function NivelBadge({ nivel }: { nivel: number | null | undefined }) {
  const c = classificar(nivel);
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${c.cor}`}>
      {c.nome} ({nivel ?? "—"})
    </span>
  );
}
