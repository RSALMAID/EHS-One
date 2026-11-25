export const MOTIVOS: Record<string, string> = {
  primeira: "Primeira entrega",
  troca: "Troca por desgaste/prazo",
  perda: "Perda",
  dano: "Dano",
};

import { dataBR, diasAte, somarDias } from "./datas";

export { dataBR, diasAte, hoje, somarDias } from "./datas";

/** Situação do CA: vencido, vence em até 30 dias, ou ok. */
export function situacaoCA(validade: string | null): { texto: string; classe: string } {
  if (!validade) return { texto: "sem validade informada", classe: "text-slate-500" };
  const dias = diasAte(validade);
  if (dias < 0) return { texto: `CA vencido em ${dataBR(validade)}`, classe: "text-red-700 font-semibold" };
  if (dias <= 30) return { texto: `CA vence em ${dias} dia(s)`, classe: "text-amber-700 font-semibold" };
  return { texto: `CA válido até ${dataBR(validade)}`, classe: "text-slate-600" };
}

export type Item = {
  id: string;
  name: string;
  ca_number: string | null;
  ca_valid_until: string | null;
  replacement_days: number | null;
  stock: number;
  active: boolean;
};
export type Entrega = { ppe_item_id: string; worker_id: string; delivered_on: string };
export type Trabalhador = { id: string; full_name: string; job_role_id: string | null };

export type Pendencia = {
  tipo: "falta" | "troca";
  trabalhador: Trabalhador;
  item: Item;
  /** Para "troca": data em que a troca vence. */
  vence?: string;
};

/**
 * Quem está sem um EPI obrigatório do cargo, e quem tem troca vencida
 * ou vencendo em até 15 dias (última entrega + prazo de troca).
 */
export function calcularPendencias(
  trabalhadores: Trabalhador[],
  itens: Item[],
  obrigatorios: { ppe_item_id: string; job_role_id: string }[],
  entregas: Entrega[],
): Pendencia[] {
  const lista: Pendencia[] = [];
  for (const t of trabalhadores) {
    if (!t.job_role_id) continue;
    const exigidos = obrigatorios.filter((o) => o.job_role_id === t.job_role_id);
    for (const o of exigidos) {
      const item = itens.find((i) => i.id === o.ppe_item_id && i.active);
      if (!item) continue;
      const ultima = entregas
        .filter((e) => e.worker_id === t.id && e.ppe_item_id === item.id)
        .map((e) => e.delivered_on)
        .sort()
        .at(-1);
      if (!ultima) {
        lista.push({ tipo: "falta", trabalhador: t, item });
      } else if (item.replacement_days) {
        const vence = somarDias(ultima, item.replacement_days);
        if (diasAte(vence) <= 15) lista.push({ tipo: "troca", trabalhador: t, item, vence });
      }
    }
  }
  return lista;
}
