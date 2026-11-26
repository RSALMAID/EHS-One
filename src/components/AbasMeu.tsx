"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone } from "./Icone";

export type Aba = { href: string; label: string; icone: string };

/** Barra de abas do Meu EHS, no rodapé, com a aba atual destacada. */
export function AbasMeu({ abas }: { abas: Aba[] }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg text-center text-[11px]">
        {abas.map((a) => {
          const ativa = a.href === "/meu" ? pathname === "/meu" : pathname === a.href || pathname.startsWith(`${a.href}/`);
          return (
            <li key={a.href} className="flex-1">
              <Link
                href={a.href}
                aria-current={ativa ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 px-1 py-2 font-medium active:bg-slate-100 ${
                  ativa ? "text-emerald-700" : "text-slate-500"
                }`}
              >
                <Icone nome={a.icone} className="h-5 w-5" />
                {a.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
