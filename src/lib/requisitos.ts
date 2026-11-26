import { somarMeses } from "./datas";

export const AREAS_LEGAIS: Record<string, string> = {
  seguranca: "Segurança do trabalho",
  saude: "Saúde e higiene ocupacional",
  meio_ambiente: "Meio ambiente",
};

export const ESFERAS: Record<string, string> = {
  federal: "Federal",
  estadual: "Estadual",
  municipal: "Municipal",
  outro: "Outro (norma técnica, contrato, licença)",
};

export const SITUACAO_LEGAL: Record<string, { nome: string; cor: string }> = {
  nao_avaliado: { nome: "Não avaliado", cor: "bg-slate-100 text-slate-700" },
  atende: { nome: "Atende", cor: "bg-emerald-100 text-emerald-800" },
  atende_parcial: { nome: "Atende parcialmente", cor: "bg-amber-100 text-amber-800" },
  nao_atende: { nome: "Não atende", cor: "bg-red-100 text-red-800" },
};

/** Próxima avaliação: última + periodicidade; sem avaliação, já está pendente. */
export function proximaAvaliacao(ultima: string | null, meses: number): string | null {
  return ultima ? somarMeses(ultima, meses) : null;
}

type Base = { area: string; source: string; title: string; requirement: string };

/**
 * Lista inicial para a empresa revisar: marque como "não se aplica" o que não for do seu caso
 * e inclua as leis estaduais e municipais e as condicionantes da sua licença ambiental.
 */
export const LISTA_BASICA: Base[] = [
  { area: "seguranca", source: "NR-01", title: "Disposições gerais e GRO", requirement: "Manter o PGR (inventário de riscos e plano de ação) atualizado e informar os trabalhadores sobre os riscos." },
  { area: "seguranca", source: "NR-04", title: "SESMT", requirement: "Dimensionar e manter o SESMT conforme o grau de risco e o número de empregados." },
  { area: "seguranca", source: "NR-05", title: "CIPA", requirement: "Constituir a CIPA (ou designar responsável), treinar os membros e realizar as reuniões mensais com ata." },
  { area: "seguranca", source: "NR-06", title: "EPI", requirement: "Fornecer EPI com CA válido, gratuito, treinar no uso e registrar a entrega." },
  { area: "seguranca", source: "NR-10", title: "Segurança em instalações elétricas", requirement: "Manter prontuário das instalações e trabalhadores autorizados e treinados (básico e SEP quando aplicável)." },
  { area: "seguranca", source: "NR-11", title: "Movimentação de materiais", requirement: "Operadores de equipamentos de transporte habilitados e com cartão de identificação." },
  { area: "seguranca", source: "NR-12", title: "Máquinas e equipamentos", requirement: "Inventário de máquinas, proteções e dispositivos de segurança, apreciação de risco e capacitação dos operadores." },
  { area: "seguranca", source: "NR-13", title: "Caldeiras e vasos de pressão", requirement: "Prontuário, inspeções periódicas e operadores capacitados." },
  { area: "seguranca", source: "NR-18", title: "Construção civil", requirement: "PGR da obra, áreas de vivência e treinamentos conforme a norma." },
  { area: "seguranca", source: "NR-20", title: "Inflamáveis e combustíveis", requirement: "Análise de riscos, plano de resposta a emergências e capacitação conforme a classe da instalação." },
  { area: "seguranca", source: "NR-23", title: "Proteção contra incêndios", requirement: "Saídas de emergência, equipamentos de combate e treinamento, junto com as exigências do Corpo de Bombeiros." },
  { area: "seguranca", source: "NR-26", title: "Sinalização e rotulagem", requirement: "Sinalizar riscos e rotular produtos químicos com FDS disponível." },
  { area: "seguranca", source: "NR-33", title: "Espaços confinados", requirement: "Cadastro dos espaços, permissão de entrada, vigia e capacitação de trabalhadores e supervisores." },
  { area: "seguranca", source: "NR-35", title: "Trabalho em altura", requirement: "Análise de risco/PT, capacitação a cada 2 anos e aptidão no ASO." },
  { area: "saude", source: "NR-07", title: "PCMSO", requirement: "Manter o PCMSO, realizar os exames (ASO) e emitir o relatório analítico anual." },
  { area: "saude", source: "NR-09", title: "Avaliação das exposições ocupacionais", requirement: "Avaliar as exposições a agentes físicos, químicos e biológicos e adotar medidas de prevenção." },
  { area: "saude", source: "NR-15", title: "Atividades insalubres", requirement: "Caracterizar a insalubridade por laudo e controlar as exposições acima dos limites." },
  { area: "saude", source: "NR-16", title: "Atividades perigosas", requirement: "Caracterizar a periculosidade por laudo quando houver atividades previstas na norma." },
  { area: "saude", source: "NR-17", title: "Ergonomia", requirement: "Avaliação ergonômica preliminar e AET quando necessário." },
  { area: "saude", source: "NR-24", title: "Condições sanitárias e de conforto", requirement: "Instalações sanitárias, vestiários, refeitório e água potável adequados." },
  { area: "saude", source: "eSocial (S-2210/S-2220/S-2240)", title: "Eventos de SST", requirement: "Enviar CAT, monitoramento da saúde e condições ambientais nos prazos." },
  { area: "meio_ambiente", source: "Lei 6.938/1981", title: "Política Nacional do Meio Ambiente", requirement: "Ter as licenças ambientais exigidas e manter o Cadastro Técnico Federal (CTF/APP) e o RAPP no IBAMA quando aplicável." },
  { area: "meio_ambiente", source: "Resolução CONAMA 237/1997", title: "Licenciamento ambiental", requirement: "Manter a licença de operação válida e cumprir as condicionantes." },
  { area: "meio_ambiente", source: "Lei 12.305/2010", title: "Política Nacional de Resíduos Sólidos", requirement: "Elaborar o PGRS quando exigido e dar destinação adequada aos resíduos." },
  { area: "meio_ambiente", source: "Portaria MMA 280/2020", title: "MTR e DMR (SINIR)", requirement: "Emitir o Manifesto de Transporte de Resíduos e a declaração periódica no SINIR." },
  { area: "meio_ambiente", source: "Resolução CONAMA 275/2001", title: "Coleta seletiva", requirement: "Identificar recipientes de coleta seletiva pelo código de cores." },
  { area: "meio_ambiente", source: "Resolução CONAMA 430/2011", title: "Lançamento de efluentes", requirement: "Atender aos padrões de lançamento de efluentes e monitorar conforme a licença." },
  { area: "meio_ambiente", source: "Resolução CONAMA 362/2005", title: "Óleo lubrificante usado", requirement: "Destinar óleo usado ou contaminado ao rerrefino por coletor autorizado." },
  { area: "meio_ambiente", source: "Lei 9.433/1997", title: "Recursos hídricos", requirement: "Ter outorga para captação de água e lançamento de efluentes quando aplicável." },
  { area: "meio_ambiente", source: "Lei 9.605/1998", title: "Crimes ambientais", requirement: "Evitar poluição e atividades sem licença; base para as sanções." },
];
