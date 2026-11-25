export type NavItem = { label: string; href?: string; phase: "MVP" | "V2" | "Premium"; module?: string };
export type NavGroup = { title: string; items: NavItem[] };

// Espelha o mapa de telas: itens com href já existem; os demais aparecem
// como "em breve" para mostrar a estrutura completa do produto.
export const NAV: NavGroup[] = [
  {
    title: "Início",
    items: [
      { label: "Painel", href: "/app", phase: "MVP" },
      { label: "Agenda EHS", phase: "MVP" },
      { label: "Plano de ação", href: "/app/acoes", phase: "MVP", module: "acoes" },
      { label: "Copiloto", phase: "MVP" },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { label: "Empresa e unidades", href: "/app/empresa", phase: "MVP" },
      { label: "Setores", href: "/app/setores", phase: "MVP" },
      { label: "Cargos e funções", href: "/app/cargos", phase: "MVP" },
      { label: "Trabalhadores", href: "/app/trabalhadores", phase: "MVP" },
      { label: "Terceiros", phase: "V2" },
    ],
  },
  {
    title: "Riscos",
    items: [
      { label: "GRO/PGR", href: "/app/pgr", phase: "MVP", module: "pgr" },
      { label: "Mapa de riscos", href: "/app/pgr/mapa", phase: "MVP", module: "pgr" },
      { label: "Ergonomia", phase: "V2", module: "higiene" },
      { label: "Requisitos legais", phase: "V2", module: "requisitos_legais" },
    ],
  },
  {
    title: "Operação",
    items: [
      { label: "EPI", href: "/app/epi", phase: "MVP", module: "epi" },
      { label: "Treinamentos", href: "/app/treinamentos", phase: "MVP", module: "treinamentos" },
      { label: "Saúde ocupacional", href: "/app/saude", phase: "MVP", module: "saude" },
      { label: "Inspeções e checklists", href: "/app/inspecoes", phase: "MVP", module: "inspecoes" },
      { label: "APR digital", href: "/app/apr", phase: "MVP", module: "apr_pt" },
      { label: "Permissão de trabalho", href: "/app/pt", phase: "MVP", module: "apr_pt" },
      { label: "Eventos e desvios", href: "/app/eventos", phase: "MVP", module: "eventos" },
    ],
  },
  {
    title: "Gestão",
    items: [
      { label: "DDS", href: "/app/dds", phase: "MVP", module: "dds" },
      { label: "Comunicados", href: "/app/comunicados", phase: "MVP", module: "dds" },
      { label: "Documentos", href: "/app/documentos", phase: "MVP", module: "documentos" },
      { label: "Indicadores", phase: "V2", module: "dashboard" },
      { label: "Configurações", phase: "MVP" },
    ],
  },
];
