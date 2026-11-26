/** Ícones simples em traço (24×24), sem biblioteca externa. */
const CAMINHOS: Record<string, string> = {
  inicio: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  cadastros: "M4 21V5a2 2 0 0 1 2-2h8l6 6v12M14 3v6h6M8 13h8M8 17h5",
  riscos: "M12 3l9 16H3zM12 10v4M12 17h.01",
  operacao: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z",
  gestao: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  menu: "M4 6h16M4 12h16M4 18h16",
  fechar: "M6 6l12 12M18 6L6 18",
  relatar: "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  tarefa: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9",
  acoes: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  epi: "M12 3a8 8 0 0 0-8 8v2h16v-2a8 8 0 0 0-8-8zM2 13h20v3H2zM12 3v4",
  saude: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z",
};

export function Icone({ nome, className = "h-5 w-5" }: { nome: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={CAMINHOS[nome] ?? CAMINHOS.inicio} />
    </svg>
  );
}
