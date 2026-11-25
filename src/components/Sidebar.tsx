"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";

export function Sidebar({ modulos }: { modulos: string[] }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-5 text-sm">
      {NAV.map((group) => (
        <div key={group.title}>
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {group.title}
          </p>
          <ul className="mt-1 space-y-0.5">
            {group.items
              .filter((item) => !item.module || modulos.includes("*") || modulos.includes(item.module))
              .map((item) => {
              const active = item.href === pathname;
              return (
                <li key={item.label}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className={`block rounded-md px-2 py-1.5 ${
                        active
                          ? "bg-emerald-50 font-medium text-emerald-800"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="flex items-center justify-between px-2 py-1.5 text-slate-400">
                      {item.label}
                      <span className="text-[10px]">{item.phase === "MVP" ? "em breve" : item.phase}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
