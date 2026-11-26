"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV } from "@/lib/nav";
import { Icone } from "./Icone";

const ICONE_GRUPO: Record<string, string> = {
  Início: "inicio",
  Cadastros: "cadastros",
  Riscos: "riscos",
  Operação: "operacao",
  Gestão: "gestao",
};

/** Item ativo: a rota exata ou uma página dentro dela (o item mais específico vence). */
function ativo(pathname: string, todos: string[], href: string) {
  const casa = (h: string) => pathname === h || pathname.startsWith(`${h}/`);
  if (!casa(href)) return false;
  return !todos.some((h) => h !== href && h.length > href.length && casa(h));
}

function Lista({ modulos, aoNavegar }: { modulos: string[]; aoNavegar?: () => void }) {
  const pathname = usePathname();
  const hrefs = NAV.flatMap((g) => g.items.map((i) => i.href).filter(Boolean)) as string[];
  return (
    <nav className="space-y-5 text-sm">
      {NAV.map((group) => {
        const itens = group.items.filter((item) => !item.module || modulos.includes("*") || modulos.includes(item.module));
        if (!itens.length) return null;
        return (
          <div key={group.title}>
            <p className="flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Icone nome={ICONE_GRUPO[group.title] ?? "inicio"} className="h-4 w-4" />
              {group.title}
            </p>
            <ul className="mt-1 space-y-0.5">
              {itens.map((item) =>
                item.href ? (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={aoNavegar}
                      aria-current={ativo(pathname, hrefs, item.href) ? "page" : undefined}
                      className={`block rounded-md px-2 py-1.5 ${
                        ativo(pathname, hrefs, item.href)
                          ? "bg-emerald-50 font-medium text-emerald-800 ring-1 ring-emerald-100"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ) : (
                  <li key={item.label} className="flex items-center justify-between px-2 py-1 text-slate-400">
                    {item.label}
                    <span className="text-[10px]">{item.phase === "MVP" ? "em breve" : item.phase}</span>
                  </li>
                ),
              )}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

/** Menu da Gestão: fixo à esquerda no computador; gaveta no celular. */
export function Sidebar({ modulos, empresa }: { modulos: string[]; empresa: string }) {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();
  useEffect(() => setAberto(false), [pathname]);

  const marca = (
    <Link href="/app" className="flex items-center gap-2 px-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-xs font-bold text-white">EHS</span>
      <span>
        <span className="block text-base font-semibold leading-tight text-slate-900">EHS One</span>
        <span className="block max-w-40 truncate text-xs text-slate-500">{empresa}</span>
      </span>
    </Link>
  );

  return (
    <>
      {/* Celular: barra com botão de menu */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2 md:hidden print:hidden">
        {marca}
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="rounded-md p-2 text-slate-700 hover:bg-slate-100"
          aria-label="Abrir menu"
        >
          <Icone nome="menu" />
        </button>
      </div>
      {aberto && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Fechar menu" onClick={() => setAberto(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-white p-4 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              {marca}
              <button type="button" onClick={() => setAberto(false)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100" aria-label="Fechar menu">
                <Icone nome="fechar" />
              </button>
            </div>
            <Lista modulos={modulos} aoNavegar={() => setAberto(false)} />
          </aside>
        </div>
      )}

      {/* Computador: coluna fixa */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4 md:block print:hidden">
        <div className="mb-6">{marca}</div>
        <Lista modulos={modulos} />
      </aside>
    </>
  );
}
