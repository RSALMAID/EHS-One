"use client";

import { Lock, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { itemAtual, itemLiberado, NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

function Lista({ modulos, recolhido = false, aoNavegar }: { modulos: string[]; recolhido?: boolean; aoNavegar?: () => void }) {
  const pathname = usePathname();
  const atual = itemAtual(pathname)?.item.href;
  const base = "flex items-center gap-2.5 rounded-md px-2 py-1.5";
  return (
    <nav className={cn("text-sm", recolhido ? "space-y-3" : "space-y-5")}>
      {NAV.map((group) => (
        <div key={group.title}>
          {recolhido ? (
            <div className="mx-2 border-t border-slate-200" />
          ) : (
            <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.title}</p>
          )}
          <ul className="mt-1 space-y-0.5">
            {group.items.map((item) => {
              const Icone = item.icon;
              const rotulo = recolhido ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>;
              if (!item.href) {
                if (recolhido) return null;
                return (
                  <li key={item.label} className={cn(base, "text-slate-400")}>
                    <Icone className="size-4 shrink-0" aria-hidden />
                    <span className="flex-1 truncate">{item.label}</span>
                    <span className="text-[10px]">{item.phase === "MVP" ? "em breve" : item.phase}</span>
                  </li>
                );
              }
              if (!itemLiberado(modulos, item.module)) {
                return (
                  <li key={item.label}>
                    <Link
                      href={`/app/plano?modulo=${item.module}`}
                      onClick={aoNavegar}
                      title={`${item.label}: não incluído no seu plano`}
                      className={cn(base, "text-slate-400 hover:bg-slate-100", recolhido && "justify-center")}
                    >
                      <Icone className="size-4 shrink-0" aria-hidden />
                      {rotulo}
                      {!recolhido && <Lock className="ml-auto size-3.5 shrink-0" aria-label="não incluído no plano" />}
                    </Link>
                  </li>
                );
              }
              const ativo = atual === item.href;
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={aoNavegar}
                    title={recolhido ? item.label : undefined}
                    aria-current={ativo ? "page" : undefined}
                    className={cn(
                      base,
                      recolhido && "justify-center",
                      ativo
                        ? "bg-emerald-50 font-medium text-emerald-800 ring-1 ring-emerald-100"
                        : "text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    <Icone className={cn("size-4 shrink-0", ativo ? "text-emerald-700" : "text-slate-500")} aria-hidden />
                    {rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Marca({ empresa, recolhido = false }: { empresa: string; recolhido?: boolean }) {
  return (
    <Link href="/app" className={cn("flex items-center gap-2", !recolhido && "px-2")} title="Início">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-[11px] font-bold text-white">EHS</span>
      {!recolhido && (
        <span className="min-w-0">
          <span className="block text-base font-semibold leading-tight text-slate-900">EHS One</span>
          <span className="block max-w-40 truncate text-xs text-slate-500">{empresa}</span>
        </span>
      )}
    </Link>
  );
}

/** Menu da Gestão: fixo à esquerda no computador (recolhível); gaveta no celular. */
export function Sidebar({ modulos, empresa, recolhidoInicial }: { modulos: string[]; empresa: string; recolhidoInicial: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [recolhido, setRecolhido] = useState(recolhidoInicial);
  const pathname = usePathname();
  useEffect(() => setAberto(false), [pathname]);

  const alternar = () => {
    const novo = !recolhido;
    setRecolhido(novo);
    document.cookie = `menu=${novo ? "recolhido" : "aberto"}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <>
      {/* Celular: barra com botão de menu */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2 md:hidden print:hidden">
        <Marca empresa={empresa} />
        <button type="button" onClick={() => setAberto(true)} className="rounded-md p-2 text-slate-700 hover:bg-slate-100" aria-label="Abrir menu">
          <Menu className="size-5" />
        </button>
      </div>
      {aberto && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Fechar menu" onClick={() => setAberto(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-white p-4 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <Marca empresa={empresa} />
              <button type="button" onClick={() => setAberto(false)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100" aria-label="Fechar menu">
                <X className="size-5" />
              </button>
            </div>
            <Lista modulos={modulos} aoNavegar={() => setAberto(false)} />
          </aside>
        </div>
      )}

      {/* Computador: coluna fixa, larga ou só com ícones */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] md:flex print:hidden",
          recolhido ? "w-16" : "w-64",
        )}
      >
        <div className={cn("flex h-14 items-center border-b border-slate-200", recolhido ? "justify-center" : "px-2")}>
          <Marca empresa={empresa} recolhido={recolhido} />
        </div>
        <div className={cn("flex-1 overflow-y-auto py-4", recolhido ? "px-2" : "px-3")}>
          <Lista modulos={modulos} recolhido={recolhido} />
        </div>
        <button
          type="button"
          onClick={alternar}
          className={cn(
            "flex items-center gap-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-800",
            recolhido && "justify-center px-0",
          )}
          aria-label={recolhido ? "Abrir menu" : "Recolher menu"}
          title={recolhido ? "Abrir menu" : "Recolher menu"}
        >
          {recolhido ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!recolhido && "Recolher menu"}
        </button>
      </aside>
    </>
  );
}
