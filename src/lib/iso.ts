export const NORMAS: Record<string, string> = {
  "45001": "ISO 45001 (SST)",
  "14001": "ISO 14001 (meio ambiente)",
  ambas: "ISO 45001 e 14001",
};

export const STATUS_OBJETIVO: Record<string, { nome: string; cor: string }> = {
  em_andamento: { nome: "Em andamento", cor: "bg-sky-100 text-sky-800" },
  atingido: { nome: "Atingido", cor: "bg-emerald-100 text-emerald-800" },
  nao_atingido: { nome: "Não atingido", cor: "bg-red-100 text-red-800" },
  cancelado: { nome: "Cancelado", cor: "bg-slate-100 text-slate-700" },
};

export const DIRECAO: Record<string, string> = { reduzir: "Reduzir até", aumentar: "Aumentar até", manter: "Manter em" };

export const TIPOS_AUDITORIA: Record<string, string> = {
  interna: "Interna",
  externa: "Externa (cliente, consultoria)",
  certificacao: "Certificação / manutenção",
};

export const STATUS_AUDITORIA: Record<string, string> = {
  planejada: "Planejada",
  realizada: "Realizada",
  cancelada: "Cancelada",
};

export const TIPOS_CONSTATACAO: Record<string, { nome: string; cor: string; acao: boolean }> = {
  nc_maior: { nome: "Não conformidade maior", cor: "bg-red-100 text-red-800", acao: true },
  nc_menor: { nome: "Não conformidade menor", cor: "bg-amber-100 text-amber-800", acao: true },
  observacao: { nome: "Observação", cor: "bg-sky-100 text-sky-800", acao: true },
  oportunidade: { nome: "Oportunidade de melhoria", cor: "bg-violet-100 text-violet-800", acao: true },
  ponto_forte: { nome: "Ponto forte", cor: "bg-emerald-100 text-emerald-800", acao: false },
};

export const numeroAuditoria = (n: number) => `AUD-${String(n).padStart(4, "0")}`;

/** Meta atingida pela última medição? (null quando não dá para dizer) */
export function metaAtingida(direcao: string, alvo: number | null, valor: number | null) {
  if (alvo === null || valor === null) return null;
  if (direcao === "reduzir") return valor <= alvo;
  if (direcao === "aumentar") return valor >= alvo;
  return valor === alvo;
}

/** Onde cada requisito das normas é atendido no sistema (estrutura comum das duas). */
export const CLAUSULAS: { n: string; titulo: string; onde: { nome: string; href: string }[] }[] = [
  { n: "4", titulo: "Contexto, partes interessadas e escopo", onde: [{ nome: "Empresa e unidades", href: "/app/empresa" }] },
  { n: "5.4", titulo: "Consulta e participação dos trabalhadores (45001)", onde: [{ nome: "CIPA", href: "/app/cipa" }, { nome: "DDS", href: "/app/dds" }] },
  { n: "6.1.2", titulo: "Perigos e riscos (45001) · aspectos e impactos (14001)", onde: [{ nome: "GRO/PGR", href: "/app/pgr" }, { nome: "Meio ambiente", href: "/app/ambiente" }, { nome: "Higiene ocupacional", href: "/app/higiene" }] },
  { n: "6.1.3", titulo: "Requisitos legais e outros requisitos", onde: [{ nome: "Requisitos legais", href: "/app/requisitos" }] },
  { n: "6.2", titulo: "Objetivos e planejamento para alcançá-los", onde: [{ nome: "Objetivos e metas", href: "/app/iso/objetivos" }] },
  { n: "7.2", titulo: "Competência", onde: [{ nome: "Treinamentos", href: "/app/treinamentos" }, { nome: "Autorizações", href: "/app/autorizacoes" }] },
  { n: "7.4", titulo: "Comunicação", onde: [{ nome: "Comunicados", href: "/app/comunicados" }, { nome: "DDS", href: "/app/dds" }] },
  { n: "7.5", titulo: "Informação documentada", onde: [{ nome: "Documentos", href: "/app/documentos" }] },
  { n: "8.1", titulo: "Controle operacional", onde: [{ nome: "APR", href: "/app/apr" }, { nome: "Permissão de trabalho", href: "/app/pt" }, { nome: "EPI", href: "/app/epi" }] },
  { n: "8.2", titulo: "Preparação e resposta a emergências", onde: [{ nome: "Documentos (plano de emergência)", href: "/app/documentos" }, { nome: "Treinamentos (brigada)", href: "/app/treinamentos" }] },
  { n: "9.1", titulo: "Monitoramento, medição e avaliação de desempenho", onde: [{ nome: "Painel", href: "/painel" }, { nome: "Inspeções", href: "/app/inspecoes" }, { nome: "Saúde ocupacional", href: "/app/saude" }] },
  { n: "9.1.2", titulo: "Avaliação do atendimento aos requisitos legais", onde: [{ nome: "Requisitos legais", href: "/app/requisitos" }] },
  { n: "9.2", titulo: "Auditoria interna", onde: [{ nome: "Auditorias", href: "/app/iso/auditorias" }] },
  { n: "9.3", titulo: "Análise crítica pela direção", onde: [{ nome: "Análise crítica", href: "/app/iso/analise" }] },
  { n: "10.2", titulo: "Incidentes, não conformidades e ação corretiva", onde: [{ nome: "Eventos e desvios", href: "/app/eventos" }, { nome: "Plano de ação", href: "/app/acoes" }] },
  { n: "10.3", titulo: "Melhoria contínua", onde: [{ nome: "Plano de ação", href: "/app/acoes" }, { nome: "Painel", href: "/painel" }] },
];
