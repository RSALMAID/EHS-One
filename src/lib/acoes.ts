import { hoje, somarDias } from "./datas";

export const ORIGENS: Record<string, string> = {
  pgr: "PGR",
  inspecao: "Inspeção",
  ocorrencia: "Ocorrência",
  auditoria: "Auditoria",
  ergonomia: "Ergonomia",
  dds: "DDS",
  treinamento: "Treinamento",
  documento: "Documento",
  observacao: "Observação",
  requisito_legal: "Requisito legal",
  vencimento: "Vencimento",
  outro: "Outro",
};

export const STATUS_ACAO: Record<string, string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  aguardando_validacao: "Aguardando validação",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const STATUS_PLANO: Record<string, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export function encerrada(status: string) {
  return status === "concluida" || status === "cancelada";
}

/** Semáforo de prazo de uma ação. */
export function prazo(due: string | null, status: string) {
  if (encerrada(status)) return { cor: "bg-emerald-500", texto: STATUS_ACAO[status] };
  if (status === "aguardando_validacao") return { cor: "bg-sky-500", texto: "Aguardando validação" };
  if (!due) return { cor: "bg-slate-300", texto: "Sem prazo" };
  const h = hoje();
  if (due < h) return { cor: "bg-red-500", texto: "Atrasada" };
  if (due <= somarDias(h, 7)) return { cor: "bg-amber-500", texto: "Vence em até 7 dias" };
  return { cor: "bg-emerald-500", texto: "No prazo" };
}

export function numero(n: number) {
  return `#${String(n).padStart(4, "0")}`;
}

/** Nome de arquivo seguro para o Storage. */
export function nomeArquivo(nome: string) {
  const limpo = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_");
  return `${Date.now()}_${limpo}`.slice(0, 120);
}
