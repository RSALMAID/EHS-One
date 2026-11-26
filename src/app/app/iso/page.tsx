import Link from "next/link";
import { dataBR, hoje } from "@/lib/datas";
import { CLAUSULAS, numeroAuditoria } from "@/lib/iso";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export default async function IsoPage() {
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: objetivos }, { data: auditorias }, { data: analises }] = await Promise.all([
    supabase.from("iso_objectives").select("status").eq("organization_id", org.id),
    supabase
      .from("audits")
      .select("id, number, planned_on, status")
      .eq("organization_id", org.id)
      .order("planned_on", { ascending: false }),
    supabase.from("management_reviews").select("held_on").eq("organization_id", org.id).order("held_on", { ascending: false }).limit(1),
  ]);
  const h = hoje();
  const proxima = (auditorias ?? []).filter((a) => a.status === "planejada" && a.planned_on >= h).at(-1);
  const ultimaRealizada = (auditorias ?? []).find((a) => a.status === "realizada");
  const cartoes = [
    {
      titulo: "Objetivos e metas",
      href: "/app/iso/objetivos",
      texto: `${(objetivos ?? []).filter((o) => o.status === "em_andamento").length} em andamento · ${(objetivos ?? []).filter((o) => o.status === "atingido").length} atingidos`,
    },
    {
      titulo: "Auditorias",
      href: "/app/iso/auditorias",
      texto: proxima
        ? `Próxima: ${numeroAuditoria(proxima.number)} em ${dataBR(proxima.planned_on)}`
        : ultimaRealizada
          ? `Última realizada: ${numeroAuditoria(ultimaRealizada.number)}`
          : "Nenhuma auditoria registrada",
    },
    {
      titulo: "Análise crítica pela direção",
      href: "/app/iso/analise",
      texto: analises?.[0] ? `Última em ${dataBR(analises[0].held_on)}` : "Nenhuma registrada",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">ISO 45001 e ISO 14001</h1>
      <p className="mt-1 text-sm text-slate-600">
        Os módulos do sistema já cobrem a maior parte do que as duas normas pedem. Aqui ficam o que é próprio do sistema de
        gestão: objetivos e metas, auditorias e análise crítica pela direção. O quadro abaixo mostra onde cada requisito é
        atendido, para usar na preparação da auditoria.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {cartoes.map((c) => (
          <Link key={c.href} href={c.href} className="rounded-lg border border-slate-200 bg-white p-4 text-sm hover:border-emerald-600">
            <p className="font-semibold text-emerald-800">{c.titulo}</p>
            <p className="mt-1 text-slate-600">{c.texto}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 font-semibold">Onde cada requisito é atendido</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse rounded-lg bg-white text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Requisito</th>
              <th className="px-3 py-2">No EHS One</th>
            </tr>
          </thead>
          <tbody>
            {CLAUSULAS.map((c) => (
              <tr key={c.n + c.titulo} className="border-b border-slate-100">
                <td className="px-3 py-2 font-medium">{c.n}</td>
                <td className="px-3 py-2">{c.titulo}</td>
                <td className="px-3 py-2">
                  {c.onde.map((o, i) => (
                    <span key={o.href + o.nome}>
                      {i > 0 && " · "}
                      <Link href={o.href} className="text-emerald-700 underline">{o.nome}</Link>
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        A política de SST e ambiental, o escopo e o plano de emergência são documentos: guarde-os em Documentos.
      </p>
    </div>
  );
}
