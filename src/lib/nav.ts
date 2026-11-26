import {
  Armchair,
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartColumn,
  ClipboardCheck,
  Clock,
  CreditCard,
  FileKey,
  FileWarning,
  FlaskConical,
  FolderOpen,
  GraduationCap,
  Handshake,
  HardHat,
  HeartPulse,
  LayoutDashboard,
  Leaf,
  ListChecks,
  type LucideIcon,
  Map,
  Megaphone,
  MessagesSquare,
  Network,
  Scale,
  ShieldAlert,
  Siren,
  Sparkles,
  Stethoscope,
  Users,
  UsersRound,
} from "lucide-react";

export type NavItem = { label: string; href?: string; phase: "MVP" | "V2" | "Premium"; module?: string; icon: LucideIcon };
export type NavGroup = { title: string; items: NavItem[] };

// Espelha o mapa de telas: itens com href já existem; os demais aparecem
// como "em breve" para mostrar a estrutura completa do produto.
export const NAV: NavGroup[] = [
  {
    title: "Início",
    items: [
      { label: "Início", href: "/app", phase: "MVP", icon: LayoutDashboard },
      { label: "Agenda EHS", phase: "MVP", icon: CalendarDays },
      { label: "Plano de ação", href: "/app/acoes", phase: "MVP", module: "acoes", icon: ListChecks },
      { label: "Copiloto", phase: "MVP", icon: Sparkles },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { label: "Empresa e unidades", href: "/app/empresa", phase: "MVP", icon: Building2 },
      { label: "Setores", href: "/app/setores", phase: "MVP", icon: Network },
      { label: "Cargos e funções", href: "/app/cargos", phase: "MVP", icon: BriefcaseBusiness },
      { label: "Trabalhadores", href: "/app/trabalhadores", phase: "MVP", icon: Users },
      { label: "Terceiros", phase: "V2", icon: Handshake },
    ],
  },
  {
    title: "Riscos",
    items: [
      { label: "GRO/PGR", href: "/app/pgr", phase: "MVP", module: "pgr", icon: ShieldAlert },
      { label: "Mapa de riscos", href: "/app/pgr/mapa", phase: "MVP", module: "pgr", icon: Map },
      { label: "Higiene ocupacional", href: "/app/higiene", phase: "MVP", module: "higiene", icon: FlaskConical },
      { label: "Meio ambiente", href: "/app/ambiente", phase: "MVP", module: "meio_ambiente", icon: Leaf },
      { label: "Ergonomia", phase: "V2", module: "higiene", icon: Armchair },
      { label: "Requisitos legais", href: "/app/requisitos", phase: "MVP", module: "requisitos_legais", icon: Scale },
    ],
  },
  {
    title: "Operação",
    items: [
      { label: "EPI", href: "/app/epi", phase: "MVP", module: "epi", icon: HardHat },
      { label: "Treinamentos", href: "/app/treinamentos", phase: "MVP", module: "treinamentos", icon: GraduationCap },
      { label: "Autorizações", href: "/app/autorizacoes", phase: "MVP", module: "autorizacoes", icon: BadgeCheck },
      { label: "Saúde ocupacional", href: "/app/saude", phase: "MVP", module: "saude", icon: HeartPulse },
      { label: "Inspeções e checklists", href: "/app/inspecoes", phase: "MVP", module: "inspecoes", icon: ClipboardCheck },
      { label: "APR digital", href: "/app/apr", phase: "MVP", module: "apr_pt", icon: FileWarning },
      { label: "Permissão de trabalho", href: "/app/pt", phase: "MVP", module: "apr_pt", icon: FileKey },
      { label: "Eventos e desvios", href: "/app/eventos", phase: "MVP", module: "eventos", icon: Siren },
    ],
  },
  {
    title: "Gestão",
    items: [
      { label: "DDS", href: "/app/dds", phase: "MVP", module: "dds", icon: MessagesSquare },
      { label: "Comunicados", href: "/app/comunicados", phase: "MVP", module: "dds", icon: Megaphone },
      { label: "Documentos", href: "/app/documentos", phase: "MVP", module: "documentos", icon: FolderOpen },
      { label: "CIPA", href: "/app/cipa", phase: "MVP", module: "cipa_sesmt", icon: UsersRound },
      { label: "SESMT", href: "/app/sesmt", phase: "MVP", module: "cipa_sesmt", icon: Stethoscope },
      { label: "Painel de indicadores", href: "/painel", phase: "MVP", module: "dashboard", icon: ChartColumn },
      { label: "HHT", href: "/app/hht", phase: "MVP", module: "hht", icon: Clock },
      { label: "ISO 45001 e 14001", href: "/app/iso", phase: "MVP", module: "iso", icon: Award },
      { label: "Plano e módulos", href: "/app/plano", phase: "MVP", icon: CreditCard },
    ],
  },
];

/** Atalhos do botão "+ Novo" e da busca ⌘K: levam ao formulário de criação de cada tela. */
export const NOVOS: { label: string; href: string; module?: string; icon: LucideIcon }[] = [
  { label: "Registrar evento ou desvio", href: "/app/eventos#novo", module: "eventos", icon: Siren },
  { label: "Novo plano de ação", href: "/app/acoes#novo", module: "acoes", icon: ListChecks },
  { label: "Nova inspeção", href: "/app/inspecoes#novo", module: "inspecoes", icon: ClipboardCheck },
  { label: "Nova APR", href: "/app/apr#novo", module: "apr_pt", icon: FileWarning },
  { label: "Nova permissão de trabalho", href: "/app/pt#novo", module: "apr_pt", icon: FileKey },
  { label: "Novo DDS", href: "/app/dds#novo", module: "dds", icon: MessagesSquare },
  { label: "Novo documento", href: "/app/documentos#novo", module: "documentos", icon: FolderOpen },
  { label: "Novo trabalhador", href: "/app/trabalhadores#novo", icon: Users },
];

/** Nomes das subpáginas, para o caminho (breadcrumb) no topo. */
export const SUBPAGINAS: Record<string, string> = {
  modelos: "Modelos",
  plano: "Plano",
  todas: "Todas as ações",
  objetivos: "Objetivos",
  auditorias: "Auditorias",
  analise: "Análise crítica",
  mapa: "Mapa",
  turma: "Turma",
  reuniao: "Reunião",
};


const livre = (modulos: string[], m?: string) => !m || modulos.includes("*") || modulos.includes(m);
export const itemLiberado = livre;

/** Item do menu correspondente à rota (o mais específico vence). */
export function itemAtual(pathname: string) {
  let melhor: { grupo: string; item: NavItem } | null = null;
  for (const g of NAV)
    for (const i of g.items) {
      if (!i.href) continue;
      if (pathname === i.href || pathname.startsWith(`${i.href}/`)) {
        if (!melhor || i.href.length > melhor.item.href!.length) melhor = { grupo: g.title, item: i };
      }
    }
  return melhor;
}
