export const TIPOS_AGENTE: Record<string, string> = { fisico: "Físico", quimico: "Químico", biologico: "Biológico" };

/** Compara o resultado com o limite de tolerância e o nível de ação (NR-09/NR-15). */
export function situacaoExposicao(resultado: number, limite: number | null, nivelAcao: number | null) {
  if (limite && resultado >= limite) return { texto: "acima do limite", cor: "bg-red-600 text-white", ordem: 0 };
  if (nivelAcao && resultado >= nivelAcao) return { texto: "nível de ação", cor: "bg-amber-300 text-slate-900", ordem: 1 };
  if (!limite && !nivelAcao) return { texto: "sem referência", cor: "bg-slate-100 text-slate-600", ordem: 3 };
  return { texto: "abaixo do nível de ação", cor: "bg-emerald-100 text-emerald-800", ordem: 2 };
}

export const CONDICOES: Record<string, string> = { normal: "Normal", anormal: "Anormal", emergencia: "Emergência" };
export const CLASSES_RESIDUO: Record<string, string> = {
  I: "Classe I (perigoso)",
  IIA: "Classe II A (não inerte)",
  IIB: "Classe II B (inerte)",
};
export const UNIDADES_RESIDUO = ["kg", "t", "L", "m3", "un"];

/** Significância do aspecto ambiental pela mesma matriz 5×5. */
export function significancia(n: number) {
  if (n >= 10) return { texto: "Significativo", cor: "bg-red-600 text-white" };
  if (n >= 5) return { texto: "Moderado", cor: "bg-amber-300 text-slate-900" };
  return { texto: "Não significativo", cor: "bg-emerald-100 text-emerald-800" };
}
