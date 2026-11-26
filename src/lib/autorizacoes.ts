import { diasAte } from "./datas";

/** Autorizações mais comuns. A validade costuma acompanhar a reciclagem do treinamento. */
export const TIPOS_AUTORIZACAO: Record<string, { nome: string; nr: string }> = {
  nr10_basico: { nome: "Serviços em eletricidade (básico)", nr: "NR-10" },
  nr10_sep: { nome: "Sistema elétrico de potência (SEP)", nr: "NR-10" },
  nr11_operador: { nome: "Operador de empilhadeira, ponte rolante ou guindaste", nr: "NR-11" },
  nr12_operador: { nome: "Operação, manutenção ou inspeção de máquina", nr: "NR-12" },
  nr13_operador: { nome: "Operador de caldeira ou unidade de processo", nr: "NR-13" },
  nr20: { nome: "Trabalho com inflamáveis e combustíveis", nr: "NR-20" },
  nr33_trabalhador: { nome: "Trabalhador autorizado em espaço confinado", nr: "NR-33" },
  nr33_vigia: { nome: "Vigia de espaço confinado", nr: "NR-33" },
  nr33_supervisor: { nome: "Supervisor de entrada em espaço confinado", nr: "NR-33" },
  nr35: { nome: "Trabalho em altura", nr: "NR-35" },
  outra: { nome: "Outra autorização", nr: "" },
};

export const rotuloAutorizacao = (kind: string) => {
  const t = TIPOS_AUTORIZACAO[kind];
  return t ? (t.nr ? `${t.nr} · ${t.nome}` : t.nome) : kind;
};

export const TIPOS_EVIDENCIA: Record<string, string> = {
  lista_presenca: "Lista de presença assinada",
  certificado: "Certificado",
  conteudo: "Conteúdo / material",
  avaliacao: "Avaliação",
  foto: "Foto",
  outro: "Outro",
};

export type SituacaoAut = { tipo: "revogada" | "vencida" | "vence" | "vigente"; texto: string; classe: string };

export function situacaoAutorizacao(a: { valid_until: string | null; revoked_on: string | null }): SituacaoAut {
  if (a.revoked_on) return { tipo: "revogada", texto: "Revogada", classe: "bg-slate-200 text-slate-700" };
  if (a.valid_until) {
    const d = diasAte(a.valid_until);
    if (d < 0) return { tipo: "vencida", texto: "Vencida", classe: "bg-red-100 text-red-800" };
    if (d <= 30) return { tipo: "vence", texto: "Vence em 30 dias", classe: "bg-amber-100 text-amber-800" };
  }
  return { tipo: "vigente", texto: "Vigente", classe: "bg-emerald-100 text-emerald-800" };
}
