"use client";

import { Moon, Sun } from "lucide-react";

export function BotaoTema({ className }: { className?: string }) {
  const alternar = () => {
    const escuro = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("tema", escuro ? "escuro" : "claro");
    } catch {}
  };
  return (
    <button type="button" onClick={alternar} className={className} aria-label="Alternar tema claro ou escuro" title="Tema claro ou escuro">
      <Moon className="size-4 dark:hidden" />
      <Sun className="hidden size-4 dark:block" />
    </button>
  );
}
