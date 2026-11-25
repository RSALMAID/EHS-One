export const TIPOS_EVENTO: Record<string, { nome: string; taxa: string; grupo: "evento" | "desvio" }> = {
  acidente_com_afastamento: { nome: "Acidente com afastamento", taxa: "TF e TG", grupo: "evento" },
  acidente_sem_afastamento: { nome: "Acidente sem afastamento", taxa: "TF", grupo: "evento" },
  primeiros_socorros: { nome: "Primeiros socorros", taxa: "—", grupo: "evento" },
  incidente: { nome: "Incidente (dano material)", taxa: "—", grupo: "evento" },
  quase_acidente: { nome: "Quase acidente", taxa: "—", grupo: "evento" },
  ambiental: { nome: "Evento ambiental", taxa: "ambiental", grupo: "evento" },
  desvio_seguranca: { nome: "Desvio de segurança", taxa: "—", grupo: "desvio" },
  desvio_ambiental: { nome: "Desvio ambiental", taxa: "—", grupo: "desvio" },
};

/** O que o trabalhador escolhe no Meu EHS (linguagem simples). */
export const TIPOS_RELATO: [string, string][] = [
  ["quase_acidente", "Quase acidente: podia ter machucado alguém"],
  ["desvio_seguranca", "Desvio de segurança: ato ou condição insegura"],
  ["desvio_ambiental", "Desvio ambiental: vazamento, lixo, fumaça"],
  ["incidente", "Incidente: quebrou ou danificou algo"],
  ["acidente_sem_afastamento", "Acidente: alguém se machucou"],
];

export const STATUS_EVENTO: Record<string, string> = {
  relatado: "Relatado",
  em_analise: "Em análise",
  em_investigacao: "Em investigação",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const METODOS: Record<string, string> = {
  arvore: "Árvore de causas",
  cinco_porques: "5 porquês",
  ishikawa: "Ishikawa (6M)",
};

export const CATEGORIAS_6M: Record<string, string> = {
  metodo: "Método",
  maquina: "Máquina",
  mao_de_obra: "Mão de obra",
  material: "Material",
  meio_ambiente: "Meio ambiente",
  medida: "Medida",
};

export function numeroEvento(n: number) {
  return `E-${String(n).padStart(4, "0")}`;
}
