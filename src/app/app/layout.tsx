import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sair } from "@/app/entrar/actions";
import { Sidebar } from "@/components/Sidebar";
import { liberado, modulosLiberados } from "@/lib/modulos";
import { ehEquipe, requireOrg, testeVencido, trialDaysLeft } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const org = await requireOrg();
  if (!ehEquipe(org.role)) redirect("/meu");
  const vencido = testeVencido(org);
  if (vencido && (await headers()).get("x-caminho") !== "/app/plano") redirect("/app/plano");
  const supabase = await createClient();
  const [modulos, { data: adminPlataforma }] = await Promise.all([modulosLiberados(org.id), supabase.rpc("is_platform_admin")]);
  const dias = trialDaysLeft(org.trialEndsAt);

  return (
    <div className="min-h-screen md:flex">
      <Sidebar modulos={vencido ? [] : modulos} empresa={org.name} />
      <div className="min-w-0 flex-1">
        {org.plan === "teste" && (
          <div className={`px-4 py-2 text-center text-sm text-white print:hidden ${dias ? "bg-emerald-700" : "bg-amber-600"}`}>
            {dias
              ? `Seu período de teste termina em ${dias} ${dias === 1 ? "dia" : "dias"}. `
              : "Seu teste grátis terminou. Escolha um plano para voltar a usar o sistema; seus dados estão guardados. "}
            <Link href="/app/plano" className="font-medium underline">Escolher plano</Link>
          </div>
        )}
        <header className="hidden items-center justify-end gap-5 border-b border-slate-200 bg-white px-6 py-2.5 text-sm md:flex print:hidden">
          {liberado(modulos, "dashboard") && (
            <Link href="/painel" className="text-slate-700 hover:text-emerald-800">Painel</Link>
          )}
          {org.workerId && <Link href="/meu" className="text-slate-700 hover:text-emerald-800">Meu EHS</Link>}
          {adminPlataforma === true && <Link href="/admin" className="text-slate-700 hover:text-emerald-800">Equipe EHS One</Link>}
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
