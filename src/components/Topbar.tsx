"use client";

import { Bell, ChevronRight, LogOut, Plus, ShieldCheck, Smartphone, ChartColumn } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { sair } from "@/app/entrar/actions";
import { itemAtual, itemLiberado, NOVOS, SUBPAGINAS } from "@/lib/nav";
import { abrirNovo, Busca, irPara } from "./Busca";
import { Popover } from "./Popover";
import { BotaoTema } from "./Tema";
import { buttonVariants } from "./ui/button";

export type Aviso = { texto: string; href: string; n: number; grave?: boolean };

function Caminho() {
  const pathname = usePathname();
  const atual = itemAtual(pathname);
  if (!atual) return null;
  const resto = pathname.slice(atual.item.href!.length).split("/").filter(Boolean);
  const sub = resto.map((s) => SUBPAGINAS[s]).filter(Boolean);
  const detalhe = resto.length > sub.length;
  const partes = [...sub, ...(detalhe ? ["Detalhe"] : [])];
  return (
    <nav aria-label="Caminho" className="hidden min-w-0 items-center gap-1.5 text-sm lg:flex">
      <span className="text-slate-400">{atual.grupo}</span>
      <ChevronRight className="size-3.5 shrink-0 text-slate-300" />
      {partes.length ? (
        <Link href={atual.item.href!} className="truncate text-slate-500 hover:text-slate-900">{atual.item.label}</Link>
      ) : (
        <span className="truncate font-medium text-slate-900">{atual.item.label}</span>
      )}
      {partes.map((p, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="size-3.5 shrink-0 text-slate-300" />
          <span className={i === partes.length - 1 ? "font-medium text-slate-900" : "text-slate-500"}>{p}</span>
        </span>
      ))}
    </nav>
  );
}

const icone = "flex size-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900";
const linha = "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-slate-700 hover:bg-slate-100";

/** Barra superior da Gestão: caminho, busca ⌘K, "+ Novo", avisos, tema e conta. */
export function Topbar({
  modulos,
  avisos,
  painel,
  meu,
  admin,
}: {
  modulos: string[];
  avisos: Aviso[];
  painel: boolean;
  meu: boolean;
  admin: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    abrirNovo();
    window.addEventListener("hashchange", abrirNovo);
    return () => window.removeEventListener("hashchange", abrirNovo);
  }, [pathname]);
  const total = avisos.reduce((s, a) => s + a.n, 0);
  const novos = NOVOS.filter((n) => itemLiberado(modulos, n.module));

  return (
    <header className="sticky top-0 z-20 hidden h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-6 backdrop-blur md:flex print:hidden">
      <Caminho />
      <div className="ml-auto flex flex-1 items-center justify-end gap-1.5">
        <Busca modulos={modulos} />
        {novos.length > 0 && (
          <Popover rotulo="Criar novo registro" className="w-64" botao={() => <span className={buttonVariants({ size: "sm" })}><Plus />Novo</span>}>
            {(fechar) =>
              novos.map((n) => {
                const Icone = n.icon;
                return (
                  <button key={n.href} type="button" className={linha} onClick={() => { fechar(); irPara(router, n.href); }}>
                    <Icone className="size-4 text-slate-500" />
                    {n.label}
                  </button>
                );
              })
            }
          </Popover>
        )}
        <Popover
          rotulo={total ? `${total} avisos` : "Avisos"}
          className="w-72"
          botao={() => (
            <span className={`${icone} relative`}>
              <Bell className="size-4" />
              {total > 0 && (
                <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-4 text-white">
                  {total > 99 ? "99+" : total}
                </span>
              )}
            </span>
          )}
        >
          {(fechar) => (
            <div>
              <p className="px-2 pb-1 pt-1.5 text-xs font-semibold text-slate-500">Avisos</p>
              {avisos.filter((a) => a.n > 0).map((a) => (
                <Link key={a.href} href={a.href} onClick={fechar} className={linha}>
                  <span className={`min-w-6 rounded-full px-1.5 text-center text-xs font-semibold ${a.grave ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                    {a.n}
                  </span>
                  {a.texto}
                </Link>
              ))}
              {total === 0 && <p className="px-2 py-3 text-slate-500">Nada pendente. Tudo em dia.</p>}
            </div>
          )}
        </Popover>
        <BotaoTema className={icone} />
        <Popover
          rotulo="Conta"
          botao={() => (
            <span className={icone}>
              <span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">EU</span>
            </span>
          )}
        >
          {(fechar) => (
            <div>
              {painel && (
                <Link href="/painel" onClick={fechar} className={linha}><ChartColumn className="size-4 text-slate-500" />Painel de indicadores</Link>
              )}
              {meu && (
                <Link href="/meu" onClick={fechar} className={linha}><Smartphone className="size-4 text-slate-500" />Meu EHS (celular)</Link>
              )}
              {admin && (
                <Link href="/admin" onClick={fechar} className={linha}><ShieldCheck className="size-4 text-slate-500" />Equipe EHS One</Link>
              )}
              <form action={sair} className="mt-1 border-t border-slate-100 pt-1">
                <button className={linha}><LogOut className="size-4 text-slate-500" />Sair</button>
              </form>
            </div>
          )}
        </Popover>
      </div>
    </header>
  );
}
