import Link from "next/link";
import { Erro } from "@/components/Erro";
import { dataBR, hoje } from "@/lib/datas";
import { fmt, indicadores } from "@/lib/indicadores";
import { NORMAS } from "@/lib/iso";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { excluirAnalise, salvarAnalise } from "../actions";

type Props = { searchParams: Promise<{ erro?: string; ok?: string }> };

type Analise = {
  id: string;
  standard: string;
  held_on: string;
  participants: string | null;
  inputs: string | null;
  decisions: string | null;
};

function Campos({ a, entradas }: { a?: Analise; entradas: string }) {
  return (
    <>
      {a && <input type="hidden" name="id" value={a.id} />}
      <label>
        Data
        <input name="data" type="date" required defaultValue={a?.held_on ?? hoje()} className="input mt-1" />
      </label>
      <label>
        Norma
        <select name="norma" className="input mt-1" defaultValue={a?.standard ?? "ambas"}>
          {Object.entries(NORMAS).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
      </label>
      <label className="sm:col-span-2">
        Participantes
        <input name="participantes" defaultValue={a?.participants ?? ""} className="input mt-1" placeholder="Direção, SESMT, CIPA, gestores…" />
      </label>
      <label className="sm:col-span-2">
        Entradas (situação do sistema)
        <textarea name="entradas" rows={10} defaultValue={a?.inputs ?? entradas} className="input mt-1 font-mono text-xs" />
      </label>
      <label className="sm:col-span-2">
        Saídas (decisões, recursos, mudanças, oportunidades de melhoria)
        <textarea name="saidas" rows={5} defaultValue={a?.decisions ?? ""} className="input mt-1" />
      </label>
    </>
  );
}

export default async function AnalisePage({ searchParams }: Props) {
  const { erro, ok } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const ano = Number(hoje().slice(0, 4));
  const [{ data }, ind, { data: req }, { data: aud }, { data: obj }] = await Promise.all([
    supabase.from("management_reviews").select("*").eq("organization_id", org.id).order("held_on", { ascending: false }),
    indicadores(org.id, ano),
    supabase.from("legal_requirements").select("status, applicable").eq("organization_id", org.id),
    supabase.from("audits").select("status, done_on, audit_findings(kind, actions(status))").eq("organization_id", org.id),
    supabase.from("iso_objectives").select("status").eq("organization_id", org.id),
  ]);
  const analises = (data ?? []) as Analise[];
  const aplic = (req ?? []).filter((r) => r.applicable);
  const achados = (aud ?? []).flatMap(
    (a) => (a.audit_findings as unknown as { kind: string; actions: { status: string } | null }[]) ?? [],
  );
  const ncs = achados.filter((f) => f.kind === "nc_maior" || f.kind === "nc_menor");
  const ncsAbertas = ncs.filter((f) => f.actions && !["concluida", "cancelada"].includes(f.actions.status)).length;
  const realizadas = (aud ?? []).filter((a) => a.status === "realizada" && a.done_on?.startsWith(String(ano))).length;
  const contar = (s: string) => (obj ?? []).filter((o) => o.status === s).length;
  const entradas = [
    `Situação em ${dataBR(hoje())} (gerado pelo EHS One; revise e complete):`,
    `- Ações: ${ind.acoes.abertas} abertas, ${ind.acoes.atrasadas} atrasadas, ${ind.acoes.concluidasNoAno} concluídas em ${ano}.`,
    `- Acidentes em ${ano}: ${ind.total.comLesao} com lesão (${ind.total.comAfastamento} com afastamento), ${ind.total.dias} dias perdidos/debitados. TF ${fmt(ind.tf)} · TG ${fmt(ind.tg, 0)}.`,
    `- Inspeções em ${ano}: ${ind.inspecoes.concluidas} concluídas, conformidade ${ind.inspecoes.conformidade ?? "—"}%, ${ind.inspecoes.naoConformidades} não conformidades.`,
    `- DDS em ${ano}: ${ind.dds.realizados} realizados, ${ind.dds.presencas} presenças confirmadas.`,
    `- Requisitos legais: ${aplic.length} aplicáveis, ${aplic.filter((r) => r.status === "atende").length} atendem, ${aplic.filter((r) => r.status === "nao_atende" || r.status === "atende_parcial").length} com pendência, ${aplic.filter((r) => r.status === "nao_avaliado").length} não avaliados.`,
    `- Auditorias realizadas em ${ano}: ${realizadas}. Não conformidades: ${ncs.length}, com ${ncsAbertas} ação(ões) ainda aberta(s).`,
    `- Objetivos: ${contar("em_andamento")} em andamento, ${contar("atingido")} atingidos, ${contar("nao_atingido")} não atingidos.`,
    `- Ações das análises anteriores:`,
    `- Mudanças internas e externas (processos, legislação, partes interessadas):`,
    `- Consulta e participação dos trabalhadores (CIPA, DDS):`,
    `- Adequação de recursos e oportunidades de melhoria:`,
  ].join("\n");

  return (
    <div>
      <Link href="/app/iso" className="text-sm text-emerald-700 underline">← ISO 45001 e 14001</Link>
      <h1 className="mt-3 text-2xl font-bold">Análise crítica pela direção</h1>
      <p className="mt-1 text-sm text-slate-600">
        Pelo menos uma vez por ano a direção avalia se o sistema de gestão funciona (item 9.3). O sistema já preenche as
        entradas com a situação atual; complete e registre as decisões.
      </p>
      <Erro mensagem={erro} />
      {ok && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Análise salva.</p>}

      <ul className="mt-4 space-y-3">
        {analises.map((a) => (
          <li key={a.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm">
            <details>
              <summary className="cursor-pointer font-medium text-emerald-800">
                {dataBR(a.held_on)} · {NORMAS[a.standard]}
                {a.participants ? <span className="font-normal text-slate-500"> · {a.participants}</span> : null}
              </summary>
              <form action={salvarAnalise} className="mt-3 grid gap-3 sm:grid-cols-2">
                <Campos a={a} entradas={entradas} />
                <div className="sm:col-span-2">
                  <button className="btn">Salvar</button>
                </div>
              </form>
              <form action={excluirAnalise} className="mt-2">
                <input type="hidden" name="id" value={a.id} />
                <button className="text-xs text-red-700 underline">excluir</button>
              </form>
            </details>
          </li>
        ))}
        {!analises.length && (
          <li className="rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-6 text-center text-sm text-slate-500">
            Nenhuma análise crítica registrada.
          </li>
        )}
      </ul>

      <details className="mt-6" open={!analises.length}>
        <summary className="cursor-pointer text-sm font-medium text-emerald-800">+ Nova análise crítica</summary>
        <form action={salvarAnalise} className="mt-2 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-2">
          <Campos entradas={entradas} />
          <div className="sm:col-span-2">
            <button className="btn">Registrar análise</button>
          </div>
        </form>
      </details>
    </div>
  );
}
