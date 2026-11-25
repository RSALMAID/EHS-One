import { diasAte, somarMeses } from "./datas";

export type Treinamento = {
  id: string;
  name: string;
  norm_reference: string | null;
  workload_hours: number | null;
  validity_months: number | null;
  active: boolean;
};

/** Participação aprovada, já com a data da turma. */
export type Participacao = { worker_id: string; training_id: string; held_on: string };

export type Situacao =
  | { tipo: "nunca" }
  | { tipo: "vencido" | "vence" | "ok"; feito: string; vence: string | null };

/** Situação de um trabalhador num treinamento, pela turma mais recente em que foi aprovado. */
export function situacao(t: Treinamento, participacoes: Participacao[], workerId: string): Situacao {
  const ultima = participacoes
    .filter((p) => p.worker_id === workerId && p.training_id === t.id)
    .map((p) => p.held_on)
    .sort()
    .at(-1);
  if (!ultima) return { tipo: "nunca" };
  if (!t.validity_months) return { tipo: "ok", feito: ultima, vence: null };
  const vence = somarMeses(ultima, t.validity_months);
  const dias = diasAte(vence);
  return { tipo: dias < 0 ? "vencido" : dias <= 30 ? "vence" : "ok", feito: ultima, vence };
}

export const ROTULO: Record<Situacao["tipo"], { texto: string; classe: string }> = {
  nunca: { texto: "Não fez", classe: "bg-red-100 text-red-800" },
  vencido: { texto: "Vencido", classe: "bg-red-100 text-red-800" },
  vence: { texto: "Vence em 30 dias", classe: "bg-amber-100 text-amber-800" },
  ok: { texto: "Em dia", classe: "bg-emerald-100 text-emerald-800" },
};

export function rotuloTreinamento(t: Pick<Treinamento, "name" | "norm_reference">) {
  return t.norm_reference ? `${t.name} (${t.norm_reference})` : t.name;
}
