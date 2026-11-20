import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export default async function PainelPage() {
  const org = await requireOrg();
  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);

  const [trabalhadores, abertas, atrasadas] = await Promise.all([
    supabase.from("workers").select("id", { count: "exact", head: true }).eq("organization_id", org.id).eq("active", true),
    supabase.from("actions").select("id", { count: "exact", head: true }).eq("organization_id", org.id).in("status", ["aberta", "em_andamento", "aguardando_validacao"]),
    supabase.from("actions").select("id", { count: "exact", head: true }).eq("organization_id", org.id).in("status", ["aberta", "em_andamento"]).lt("due_date", hoje),
  ]);

  const cards = [
    { titulo: "Trabalhadores ativos", valor: trabalhadores.count ?? 0, href: "/app/trabalhadores", cor: "text-slate-900" },
    { titulo: "Ações abertas", valor: abertas.count ?? 0, href: "/app/acoes", cor: "text-amber-600" },
    { titulo: "Ações atrasadas", valor: atrasadas.count ?? 0, href: "/app/acoes", cor: "text-red-600" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Painel</h1>
      <p className="mt-1 text-sm text-slate-600">
        Primeira versão do painel. Os oito indicadores do mapa de telas entram conforme os módulos
        ficam prontos.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.titulo} href={c.href} className="rounded-lg border border-slate-200 bg-white p-5 hover:border-emerald-600">
            <p className="text-sm text-slate-500">{c.titulo}</p>
            <p className={`mt-2 text-3xl font-bold ${c.cor}`}>{c.valor}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
