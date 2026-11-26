export const RESPOSTAS: Record<string, { texto: string; classe: string }> = {
  conforme: { texto: "Sim", classe: "text-emerald-700" },
  nao_conforme: { texto: "Não", classe: "text-red-700 font-semibold" },
  na: { texto: "N/A", classe: "text-slate-500" },
};

/** Atendimento = Sim ÷ (Sim + Não). Itens N/A não entram no cálculo. */
export function atendimento(respostas: { answer: string | null }[]) {
  const sim = respostas.filter((r) => r.answer === "conforme").length;
  const nao = respostas.filter((r) => r.answer === "nao_conforme").length;
  return { sim, nao, na: respostas.filter((r) => r.answer === "na").length, pct: sim + nao ? Math.round((sim / (sim + nao)) * 100) : null };
}

export const numeroInspecao = (n: number) => `I-${String(n).padStart(4, "0")}`;

/** Conteúdo de um modelo da biblioteca do tipo checklist. */
export type ConteudoChecklist = {
  equipamento?: string;
  itens: { pergunta: string; obrigatorio?: boolean }[];
  assinaturas?: string[];
};

/** Modelos iniciais, para a empresa não começar do zero. Podem ser editados. */
export const MODELOS_EXEMPLO: { nome: string; descricao: string; perguntas: string[] }[] = [
  {
    nome: "Inspeção geral de segurança",
    descricao: "Ronda mensal nas áreas de trabalho",
    perguntas: [
      "Corredores e saídas de emergência estão livres e sinalizados?",
      "Extintores estão no lugar, sinalizados, desobstruídos e dentro da validade?",
      "Os trabalhadores estão usando os EPIs exigidos para a atividade?",
      "Máquinas têm proteções nas partes móveis e botão de emergência funcionando?",
      "Quadros elétricos estão fechados, identificados e sem fios expostos?",
      "Piso sem óleo, buracos ou materiais que causem queda?",
      "Materiais estão armazenados de forma estável e na altura permitida?",
      "Produtos químicos estão identificados e com FDS disponível?",
      "Iluminação é suficiente para a tarefa?",
      "Há kit de primeiros socorros acessível e abastecido?",
    ],
  },
  {
    nome: "Extintores e combate a incêndio",
    descricao: "Verificação mensal por equipamento ou área",
    perguntas: [
      "Extintor está no local indicado e sinalizado (placa e piso)?",
      "Acesso ao extintor está desobstruído?",
      "Manômetro indica pressão na faixa verde?",
      "Lacre e pino de segurança estão intactos?",
      "Recarga e teste hidrostático estão dentro da validade?",
      "Mangueira, difusor e corpo do extintor sem danos?",
      "Hidrantes e abrigos de mangueira em ordem?",
      "Iluminação de emergência funcionando?",
    ],
  },
  {
    nome: "Trabalho em altura (NR-35)",
    descricao: "Antes de iniciar a atividade",
    perguntas: [
      "Há Permissão de Trabalho emitida e assinada?",
      "Os trabalhadores têm treinamento de NR-35 válido e ASO apto para altura?",
      "Cinto paraquedista e talabarte inspecionados e sem danos?",
      "Ponto de ancoragem definido e resistente?",
      "Área abaixo isolada e sinalizada?",
      "Condições climáticas permitem o trabalho?",
      "Há plano de resgate definido?",
    ],
  },
];
