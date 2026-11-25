"use client";

export function BotaoImprimir() {
  return (
    <button onClick={() => window.print()} className="btn-ghost">
      Imprimir / salvar PDF
    </button>
  );
}
