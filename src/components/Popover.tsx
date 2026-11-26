"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Menu suspenso simples: abre no clique, fecha ao clicar fora, com Esc ou ao escolher um item. */
export function Popover({
  botao,
  rotulo,
  children,
  className,
  alinhar = "direita",
}: {
  botao: (aberto: boolean) => React.ReactNode;
  rotulo: string;
  children: (fechar: () => void) => React.ReactNode;
  className?: string;
  alinhar?: "direita" | "esquerda";
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={rotulo} title={rotulo} aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
        {botao(aberto)}
      </button>
      {aberto && (
        <div
          className={cn(
            "absolute top-full z-50 mt-2 min-w-56 rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-lg",
            alinhar === "direita" ? "right-0" : "left-0",
            className,
          )}
        >
          {children(() => setAberto(false))}
        </div>
      )}
    </div>
  );
}
