"use client";

import { Command } from "cmdk";
import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { itemLiberado, NAV, NOVOS } from "@/lib/nav";
import { Kbd } from "./ui/kbd";

/** Abre o formulário "#novo" da tela (e o <details>, se estiver fechado). */
export function abrirNovo() {
  if (window.location.hash !== "#novo") return;
  const el = document.getElementById("novo");
  if (!el) return;
  if (el instanceof HTMLDetailsElement) el.open = true;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.querySelector<HTMLElement>("input, select, textarea")?.focus({ preventScroll: true });
}

export function irPara(router: ReturnType<typeof useRouter>, href: string) {
  router.push(href);
  // Na mesma tela o Next não dispara "hashchange": abre o formulário depois de navegar.
  setTimeout(abrirNovo, 300);
}

const item =
  "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm text-slate-700 data-[selected=true]:bg-slate-100 data-[selected=true]:text-slate-900";
const grupo = "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400";

/** Busca rápida (⌘K / Ctrl+K): vai para qualquer tela ou cria um registro. */
export function Busca({ modulos }: { modulos: string[] }) {
  const [aberto, setAberto] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setAberto((a) => !a);
      }
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, []);

  const escolher = (href: string) => {
    setAberto(false);
    irPara(router, href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex h-9 w-full max-w-72 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 hover:bg-slate-100"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Buscar ou criar…</span>
        <Kbd className="hidden sm:inline">Ctrl K</Kbd>
      </button>
      <Command.Dialog
        open={aberto}
        onOpenChange={setAberto}
        label="Buscar no EHS One"
        overlayClassName="fixed inset-0 z-50 bg-black/40"
        contentClassName="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-3">
          <Search className="size-4 text-slate-400" />
          <Command.Input
            placeholder="Digite uma tela ou o que quer criar…"
            className="h-12 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-2 py-6 text-center text-sm text-slate-500">Nada encontrado.</Command.Empty>
          <Command.Group heading="Criar" className={grupo}>
            {NOVOS.filter((n) => itemLiberado(modulos, n.module)).map((n) => (
              <Command.Item key={n.href} value={n.label} onSelect={() => escolher(n.href)} className={item}>
                <Plus className="size-4 text-emerald-700" />
                {n.label}
              </Command.Item>
            ))}
          </Command.Group>
          {NAV.map((g) => (
            <Command.Group key={g.title} heading={g.title} className={grupo}>
              {g.items
                .filter((i) => i.href && itemLiberado(modulos, i.module))
                .map((i) => {
                  const Icone = i.icon;
                  return (
                    <Command.Item key={i.href} value={`${i.label} ${g.title}`} onSelect={() => escolher(i.href!)} className={item}>
                      <Icone className="size-4 text-slate-500" />
                      {i.label}
                    </Command.Item>
                  );
                })}
            </Command.Group>
          ))}
        </Command.List>
      </Command.Dialog>
    </>
  );
}
