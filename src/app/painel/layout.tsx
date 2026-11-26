import Link from "next/link";
import { redirect } from "next/navigation";
import { requireModule } from "@/lib/modulos";
import { ehEquipe } from "@/lib/org";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const org = await requireModule("dashboard");
  if (!ehEquipe(org.role)) redirect("/meu");
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 print:hidden">
        <div>
          <p className="font-semibold text-emerald-800">EHS One · Painel</p>
          <p className="text-xs text-slate-500">{org.name}</p>
        </div>
        <Link href="/app" className="text-sm text-emerald-700 hover:underline">Gestão</Link>
      </header>
      <main className="mx-auto max-w-5xl p-4 sm:p-8">{children}</main>
    </div>
  );
}
