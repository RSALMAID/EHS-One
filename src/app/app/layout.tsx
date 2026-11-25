import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { redirect } from "next/navigation";
import { modulosLiberados } from "@/lib/modulos";
import { ehEquipe, requireOrg, trialDaysLeft } from "@/lib/org";
import { sair } from "@/app/entrar/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const org = await requireOrg();
  if (!ehEquipe(org.role)) redirect("/meu");
  const modulos = await modulosLiberados(org.id);
  const dias = trialDaysLeft(org.trialEndsAt);

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-slate-200 bg-white p-4 md:min-h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <Link href="/app" className="block px-2 text-lg font-semibold text-emerald-800">
          EHS One
        </Link>
        <p className="mt-1 truncate px-2 text-xs text-slate-500">{org.name}</p>
        <div className="mt-6 hidden md:block">
          <Sidebar modulos={modulos} />
        </div>
      </aside>
      <div className="flex-1">
        {org.plan === "teste" && (
          <div className="bg-emerald-700 px-4 py-2 text-center text-sm text-white">
            Seu período de teste termina em {dias} {dias === 1 ? "dia" : "dias"}.
          </div>
        )}
        <header className="flex items-center justify-end gap-4 border-b border-slate-200 bg-white px-4 py-2">
          {org.workerId && (
            <Link href="/meu" className="text-sm text-emerald-700 hover:underline">Meu EHS</Link>
          )}
          <form action={sair}>
            <button className="text-sm text-slate-600 hover:underline">Sair</button>
          </form>
        </header>
        <main className="mx-auto max-w-5xl p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
