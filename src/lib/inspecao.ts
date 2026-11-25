export const RESPOSTAS: Record<string, { texto: string; classe: string }> = {
  conforme: { texto: "Conforme", classe: "text-emerald-700" },
  nao_conforme: { texto: "Não conforme", classe: "text-red-700 font-semibold" },
  na: { texto: "Não se aplica", classe: "text-slate-500" },
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
