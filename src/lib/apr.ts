import type { Role } from "./org";

export const STATUS_APR: Record<string, string> = {
  rascunho: "Rascunho",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovada: "Aprovada",
  reprovada: "Devolvida para ajuste",
  encerrada: "Encerrada",
};

export const STATUS_PT: Record<string, string> = {
  solicitada: "Solicitada",
  liberada: "Liberada",
  encerrada: "Encerrada",
  cancelada: "Cancelada",
};

export const PAPEIS: Record<string, string> = {
  executante: "Executante",
  responsavel: "Responsável pela tarefa",
  emitente: "Emitente",
  vigia: "Vigia",
};

const GERAL = [
  "A APR da tarefa foi lida e entendida por todos?",
  "Os trabalhadores estão treinados e com ASO válido para esta atividade?",
  "Os EPIs necessários estão disponíveis e em bom estado?",
  "A área foi isolada e sinalizada?",
];

/** Tipos de PT com o checklist padrão de cada um (somado às perguntas gerais). */
export const TIPOS_PT: Record<string, { nome: string; nr: string; checklist: string[] }> = {
  altura: {
    nome: "Trabalho em altura",
    nr: "NR-35",
    checklist: [
      "Cinto paraquedista e talabarte inspecionados?",
      "Ponto de ancoragem definido e resistente?",
      "Escada, andaime ou plataforma inspecionados?",
      "Plano de resgate definido?",
      "Condições do tempo adequadas (sem chuva ou vento forte)?",
    ],
  },
  espaco_confinado: {
    nome: "Espaço confinado",
    nr: "NR-33",
    checklist: [
      "Atmosfera medida (O₂, inflamáveis e tóxicos) e dentro dos limites?",
      "Ventilação instalada e funcionando?",
      "Vigia definido do lado de fora durante toda a tarefa?",
      "Fontes de energia e entradas de produtos bloqueadas?",
      "Equipe de resgate e equipamentos disponíveis?",
    ],
  },
  quente: {
    nome: "Trabalho a quente",
    nr: "NR-34 / NR-20",
    checklist: [
      "Materiais inflamáveis retirados ou protegidos num raio de 10 m?",
      "Extintor adequado ao lado da tarefa?",
      "Observador de incêndio definido?",
      "Ronda prevista após o término?",
    ],
  },
  eletrica: {
    nome: "Serviço em eletricidade",
    nr: "NR-10",
    checklist: [
      "Circuito desenergizado e bloqueado (cadeado e etiqueta)?",
      "Ausência de tensão testada?",
      "Aterramento temporário instalado?",
      "Ferramentas e EPIs isolantes inspecionados?",
    ],
  },
  escavacao: {
    nome: "Escavação",
    nr: "NR-18",
    checklist: [
      "Interferências subterrâneas (cabos, tubulações) verificadas?",
      "Escoramento ou talude adequado?",
      "Acesso e saída seguros da vala?",
    ],
  },
  icamento: {
    nome: "Içamento de carga",
    nr: "NR-11 / NR-12",
    checklist: [
      "Plano de rigging feito e capacidade do equipamento conferida?",
      "Cintas, cabos e manilhas inspecionados?",
      "Área de giro isolada?",
      "Operador habilitado?",
    ],
  },
  geral: { nome: "Trabalho geral de risco", nr: "", checklist: [] },
};

export const checklistPadrao = (tipo: string) => [...GERAL, ...(TIPOS_PT[tipo]?.checklist ?? [])];

export const numeroApr = (n: number) => `APR-${String(n).padStart(4, "0")}`;
export const numeroPt = (n: number) => `PT-${String(n).padStart(4, "0")}`;

/** Perfis que aprovam APR e liberam PT. */
export const podeAprovar = (role: Role) => ["proprietario", "admin_ehs", "gestor"].includes(role);

export function dataHora(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "—";
}

/** datetime-local vem sem fuso: interpreta como horário de Brasília. */
export function deLocal(v: string | null) {
  return v ? new Date(`${v}:00-03:00`).toISOString() : null;
}

/** Caminho de volta aceito pelas ações: só dentro do sistema. */
export function voltaSegura(v: FormDataEntryValue | null, padrao: string) {
  const s = String(v ?? "");
  return /^\/(app|meu)\/[a-z0-9/_-]*$/i.test(s) ? s : padrao;
}
