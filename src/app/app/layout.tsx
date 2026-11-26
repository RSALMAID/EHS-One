import Link from "next/link";
import { redirect } from "next/navigation";
import { sair } from "@/app/entrar/actions";
import { Sidebar } from "@/components/Sidebar";
import { liberado, modulosLiberados } from "@/lib/modulos";
import { ehEquipe, requireOrg, trialDaysLeft } from "@/lib/org";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const org = await requireOrg();
  if (!ehEquipe(org.role)) redirect("/meu");
  const modulos = await modulosLiberados(org.id);
  const dias = trialDaysLeft(org.trialEndsAt);

  return (
    <div className="min-h-screen md:flex">
      <Sidebar modulos={modulos} empresa={org.name} />
      <div className="min-w-0 flex-1">
        {org.plan === "teste" && (
          <div className="bg-emerald-700 px-4 py-2 text-center text-sm text-white print:hidden">
            Seu período de teste termina em {dias} {dias === 1 ? "dia" : "dias"}.
          </div>
        )}
        <header className="hidden items-center justify-end gap-5 border-b border-slate-200 bg-white px-6 py-2.5 text-sm md:flex print:hidden">
          {liberado(modulos, "dashboard") && (
            <Link href="/painel" className="text-slate-700 hover:text-emerald-800">Painel</Link>
          )}
          {org.workerId && <Link href="/meu" className="text-slate-700 hover:text-emerald-800">Meu EHS</Link>}
          <form action={sair}>
            <button className="text-slate-500 hover:text-slate-800">Sair</button>
          </form>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</main>
        <footer className="flex justify-center gap-5 border-t border-slate-200 py-4 text-sm md:hidden print:hidden">
          {liberado(modulos, "dashboard") && <Link href="/painel" className="text-emerald-700">Painel</Link>}
          {org.workerId && <Link href="/meu" className="text-emerald-700">Meu EHS</Link>}
          <form action={sair}>
            <button className="text-slate-500">Sair</button>
          </form>
        </footer>
      </div>
    </div>
  );
}
