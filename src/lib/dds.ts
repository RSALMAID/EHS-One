import { diasAte } from "./datas";

export const numeroDds = (n: number) => `DDS-${String(n).padStart(4, "0")}`;

export const CATEGORIAS_DOC: Record<string, string> = {
  programa: "Programa (PGR, PCMSO…)",
  laudo: "Laudo (LTCAT, insalubridade…)",
  procedimento: "Procedimento / instrução",
  politica: "Política",
  licenca: "Licença / alvará",
  certificado: "Certificado (AVCB, CA…)",
  outro: "Outro",
};

/** Situação de um documento pela validade: vencido, vence em até 30 dias, válido. */
export function situacaoValidade(validade: string | null) {
  if (!validade) return { texto: "sem validade", cor: "bg-slate-100 text-slate-600", ordem: 3 };
  const d = diasAte(validade);
  if (d < 0) return { texto: `vencido há ${-d} dia(s)`, cor: "bg-red-600 text-white", ordem: 0 };
  if (d <= 30) return { texto: `vence em ${d} dia(s)`, cor: "bg-amber-300 text-slate-900", ordem: 1 };
  return { texto: "válido", cor: "bg-emerald-100 text-emerald-800", ordem: 2 };
}
