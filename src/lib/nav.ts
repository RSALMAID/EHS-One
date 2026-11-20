export type NavItem = { label: string; href?: string; phase: "MVP" | "V2" | "Premium" };
export type NavGroup = { title: string; items: NavItem[] };

// Espelha o mapa de telas: itens com href já existem; os demais aparecem
// como "em breve" para mostrar a estrutura completa do produto.
export const NAV: NavGroup[] = [
  {
    title: "Início",
    items: [
      { label: "Painel", href: "/app", phase: "MVP" },
      { label: "Agenda EHS", phase: "MVP" },
      { label: "Central de Ações", href: "/app/acoes", phase: "MVP" },
      { label: "Copiloto", phase: "MVP" },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { label: "Empresa e unidades", phase: "MVP" },
      { label: "Setores", phase: "MVP" },
      { label: "Cargos e atividades", phase: "MVP" },
      { label: "Trabalhadores", href: "/app/trabalhadores", phase: "MVP" },
      { label: "Terceiros", phase: "V2" },
    ],
  },
  {
    title: "Riscos",
    items: [
      { label: "GRO/PGR", phase: "MVP" },
      { label: "Mapa de riscos", phase: "V2" },
      { label: "Ergonomia", phase: "V2" },
      { label: "Requisitos legais", phase: "V2" },
    ],
  },
  {
    title: "Operação",
    items: [
      { label: "EPI", phase: "MVP" },
      { label: "Treinamentos", phase: "MVP" },
      { label: "Saúde ocupacional", phase: "MVP" },
      { label: "Inspeções e checklists", phase: "MVP" },
      { label: "Ocorrências", phase: "MVP" },
    ],
  },
  {
    title: "Gestão",
    items: [
      { label: "Documentos", phase: "MVP" },
      { label: "Indicadores", phase: "V2" },
      { label: "Configurações", phase: "MVP" },
    ],
  },
];
