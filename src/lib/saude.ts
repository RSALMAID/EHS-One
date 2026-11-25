import type { Role } from "./org";
import { diasAte, somarMeses } from "./datas";

export const TIPOS_ASO: Record<string, string> = {
  admissional: "Admissional",
  periodico: "Periódico",
  retorno_trabalho: "Retorno ao trabalho",
  mudanca_risco: "Mudança de risco",
  demissional: "Demissional",
};

export const RESULTADOS: Record<string, { texto: string; classe: string }> = {
  apto: { texto: "Apto", classe: "text-emerald-700" },
  apto_com_restricao: { texto: "Apto com restrição", classe: "text-amber-700 font-semibold" },
  inapto: { texto: "Inapto", classe: "text-red-700 font-semibold" },
};

/** Quem pode ver e lançar exames realizados (dado de saúde sensível). */
export function veExames(role: Role) {
  return role === "proprietario" || role === "admin_ehs" || role === "medico";
}
/** Quem pode lançar ASO. */
export function lancaAso(role: Role) {
  return veExames(role);
}

export type Exigencia = { exam_type_id: string; job_role_id: string; periodicity_months: number };
export type ExameFeito = { worker_id: string; exam_type_id: string; performed_on: string };

export type SituacaoExame = { tipo: "nunca" } | { tipo: "vencido" | "vence" | "ok"; feito: string; vence: string };

export function situacaoExame(e: Exigencia, feitos: ExameFeito[], workerId: string): SituacaoExame {
  const ultima = feitos
    .filter((f) => f.worker_id === workerId && f.exam_type_id === e.exam_type_id)
    .map((f) => f.performed_on)
    .sort()
    .at(-1);
  if (!ultima) return { tipo: "nunca" };
  const vence = somarMeses(ultima, e.periodicity_months);
  const dias = diasAte(vence);
  return { tipo: dias < 0 ? "vencido" : dias <= 30 ? "vence" : "ok", feito: ultima, vence };
}
