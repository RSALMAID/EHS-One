import { cookies, headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sair } from "@/app/entrar/actions";
import { Sidebar } from "@/components/Sidebar";
import { BotaoTema } from "@/components/Tema";
import { type Aviso, Topbar } from "@/components/Topbar";
import { hoje, somarDias } from "@/lib/datas";
import { liberado, modulosLiberados } from "@/lib/modulos";
import { ehEquipe, requireOrg, testeVencido, trialDaysLeft } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

/** Contagens do sino de avisos. Uma falha (tabela ausente) só zera o aviso. */
async function avisos(orgId: string, modulos: string[]): Promise<Aviso[]> {
  const supabase = await createClient();
  const h = hoje();
  const conta = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const base = (t: string) => supabase.from(t).select("id", { count: "exact", head: true }).eq("organization_id", orgId);
  const [atrasadas, docs, aprs, pts] = await Promise.all([
    liberado(modulos, "acoes")
      ? conta(base("actions").not("status", "in", "(concluida,cancelada)").lt("due_date", h))
      : 0,
    liberado(modulos, "documentos")
      ? conta(base("documents").gte("valid_until", h).lte("valid_until", somarDias(h, 30)))
      : 0,
    liberado(modulos, "apr_pt") ? conta(base("aprs").eq("status", "aguardando_aprovacao")) : 0,
    liberado(modulos, "apr_pt") ? conta(base("work_permits").eq("status", "solicitada")) : 0,
  ]);
  return [
    { texto: "ações atrasadas", href: "/app/acoes/todas", n: atrasadas, grave: true },
    { texto: "documentos vencem em 30 dias", href: "/app/documentos", n: docs },
    { texto: "APRs aguardando aprovação", href: "/app/apr", n: aprs },
    { texto: "PTs aguardando liberação", href: "/app/pt", n: pts },
  ];
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const org = await requireOrg();
  if (!ehEquipe(org.role)) redirect("/meu");
  const vencido = testeVencido(org);
  if (vencido && (await headers()).get("x-caminho") !== "/app/plano") redirect("/app/plano");
  const supabase = await createClient();
  const [modulos, { data: adminPlataforma }, jar] = await Promise.all([
    modulosLiberados(org.id),
    supabase.rpc("is_platform_admin"),
    cookies(),
  ]);
  const ativos = vencido ? [] : modulos;
  const lista = vencido ? [] : await avisos(org.id, modulos);
  const dias = trialDaysLeft(org.trialEndsAt);
  const painel = liberado(ativos, "dashboard");

  return (
    <div className="min-h-screen md:flex">
      <Sidebar modulos={ativos} empresa={org.name} recolhidoInicial={jar.get("menu")?.value === "recolhido"} />
      <div className="min-w-0 flex-1">
        {org.plan === "teste" && (
          <div className={`px-4 py-2 text-center text-sm text-white print:hidden ${dias ? "bg-emerald-700" : "bg-amber-600"}`}>
            {dias
              ? `Seu período de teste termina em ${dias} ${dias === 1 ? "dia" : "dias"}. `
              : "Seu teste grátis terminou. Escolha um plano para voltar a usar o sistema; seus dados estão guardados. "}
            <Link href="/app/plano" className="font-medium underline">Escolher plano</Link>
          </div>
        )}
        <Topbar modulos={ativos} avisos={lista} painel={painel} meu={!!org.workerId} admin={adminPlataforma === true} />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</main>
        <footer className="flex items-center justify-center gap-5 border-t border-slate-200 py-4 text-sm md:hidden print:hidden">
          {painel && <Link href="/painel" className="text-emerald-700">Painel</Link>}
          {org.workerId && <Link href="/meu" className="text-emerald-700">Meu EHS</Link>}
          <BotaoTema className="rounded-md p-2 text-slate-600" />
          <form action={sair}>
            <button className="text-slate-500">Sair</button>
          </form>
        </footer>
      </div>
    </div>
  );
}
