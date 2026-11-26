import Link from "next/link";
import { hoje, somarDias } from "@/lib/datas";
import { liberado, modulosLiberados } from "@/lib/modulos";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

type Alerta = { texto: string; n: number; href: string; nivel: "critico" | "atencao" };

export default async function InicioPage() {
  const org = await requireOrg();
  const supabase = await createClient();
  const modulos = await modulosLiberados(org.id);
  const h = hoje();
  const em30 = somarDias(h, 30);
  const conta = { count: "exact" as const, head: true };

  const [trabalhadores, abertas, atrasadas, docs, cas, auts, legais, auditorias] = await Promise.all([
    supabase.from("workers").select("id", conta).eq("organization_id", org.id).eq("active", true),
    supabase.from("actions").select("id", conta).eq("organization_id", org.id).in("status", ["aberta", "em_andamento", "aguardando_validacao"]),
    supabase.from("actions").select("id", conta).eq("organization_id", org.id).in("status", ["aberta", "em_andamento"]).lt("due_date", h),
    supabase.from("documents").select("id", conta).eq("organization_id", org.id).lte("valid_until", em30),
    supabase.from("ppe_items").select("id", conta).eq("organization_id", org.id).lte("ca_valid_until", em30),
    supabase.from("work_authorizations").select("id", conta).eq("organization_id", org.id).is("revoked_on", null).lte("valid_until", em30),
    supabase.from("legal_requirements").select("id", conta).eq("organization_id", org.id).eq("applicable", true).in("status", ["nao_atende", "atende_parcial"]),
    supabase.from("audits").select("id", conta).eq("organization_id", org.id).eq("status", "planejada").gte("planned_on", h).lte("planned_on", em30),
  ]);

  const numeros = [
    { titulo: "Trabalhadores ativos", valor: trabalhadores.count ?? 0, href: "/app/trabalhadores" },
    { titulo: "Ações abertas", valor: abertas.count ?? 0, href: "/app/acoes" },
    { titulo: "Ações atrasadas", valor: atrasadas.count ?? 0, href: "/app/acoes/todas", destaque: (atrasadas.count ?? 0) > 0 },
  ];

  const alertas: Alerta[] = (
    [
      liberado(modulos, "acoes") && { texto: "ação(ões) com prazo vencido", n: atrasadas.count ?? 0, href: "/app/acoes/todas", nivel: "critico" },
      liberado(modulos, "documentos") && { texto: "documento(s) vencido(s) ou vencendo em 30 dias", n: docs.count ?? 0, href: "/app/documentos", nivel: "atencao" },
      liberado(modulos, "epi") && { texto: "EPI(s) com CA vencido ou vencendo em 30 dias", n: cas.count ?? 0, href: "/app/epi", nivel: "atencao" },
      liberado(modulos, "autorizacoes") && { texto: "autorização(ões) vencida(s) ou vencendo em 30 dias", n: auts.count ?? 0, href: "/app/autorizacoes?ver=atencao", nivel: "atencao" },
      liberado(modulos, "requisitos_legais") && { texto: "requisito(s) legal(is) não atendido(s) ou com pendência", n: legais.count ?? 0, href: "/app/requisitos?situacao=nao_atende", nivel: "critico" },
      liberado(modulos, "iso") && { texto: "auditoria(s) planejada(s) para os próximos 30 dias", n: auditorias.count ?? 0, href: "/app/iso/auditorias", nivel: "atencao" },
    ] as (Alerta | false)[]
  ).filter((a): a is Alerta => !!a && a.n > 0);

  return (
    <div>
      <h1 className="titulo">Início</h1>
      <p className="subtitulo">O que precisa da sua atenção hoje na {org.name}.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {numeros.map((c) => (
          <Link key={c.titulo} href={c.href} className="card transition hover:border-emerald-600">
            <p className="text-sm text-slate-500">{c.titulo}</p>
            <p className={`mt-2 text-3xl font-bold ${c.destaque ? "text-red-700" : "text-slate-900"}`}>{c.valor}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 font-semibold text-slate-900">Precisa de atenção</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
        {alertas.map((a) => (
          <li key={a.href}>
            <Link href={a.href} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
              <span
                className={`min-w-9 rounded-full px-2 py-0.5 text-center text-xs font-semibold ${
                  a.nivel === "critico" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                {a.n}
              </span>
              <span className="text-slate-800">{a.texto}</span>
              <span className="ml-auto text-slate-400" aria-hidden="true">›</span>
            </Link>
          </li>
        ))}
        {!alertas.length && (
          <li className="px-4 py-6 text-center text-slate-500">Nada pendente nos módulos acompanhados. Bom trabalho.</li>
        )}
      </ul>
      {liberado(modulos, "dashboard") && (
        <p className="mt-4 text-sm">
          Taxas de frequência e gravidade, inspeções e DDS estão no{" "}
          <Link href="/painel" className="text-emerald-700 underline">Painel de indicadores</Link>.
        </p>
      )}
    </div>
  );
}
