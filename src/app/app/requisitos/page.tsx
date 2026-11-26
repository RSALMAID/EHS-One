import Link from "next/link";
import { AvisoBanco } from "@/components/AvisoBanco";
import { Erro } from "@/components/Erro";
import { CamposRequisito } from "@/components/FormRequisito";
import { dataBR, hoje } from "@/lib/datas";
import { requireOrg } from "@/lib/org";
import { AREAS_LEGAIS, proximaAvaliacao, SITUACAO_LEGAL } from "@/lib/requisitos";
import { opcoesSetor } from "@/lib/setores";
import { createClient } from "@/lib/supabase/server";
import { carregarListaBasica, criarRequisito } from "./actions";

type Props = { searchParams: Promise<{ erro?: string; ok?: string; area?: string; situacao?: string }> };

export default async function RequisitosPage({ searchParams }: Props) {
  const { erro, ok, area, situacao } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data, error: falha }, setores, { data: trabalhadores }] = await Promise.all([
    supabase
      .from("legal_requirements")
      .select("id, area, source, title, applicable, status, last_evaluated_on, review_months")
      .eq("organization_id", org.id)
      .order("source"),
    opcoesSetor(org.id),
    supabase.from("workers").select("id, full_name").eq("organization_id", org.id).eq("active", true).order("full_name"),
  ]);
  const todos = data ?? [];
  const h = hoje();
  const aplicaveis = todos.filter((r) => r.applicable);
  const vencida = (r: (typeof todos)[number]) => {
    const p = proximaAvaliacao(r.last_evaluated_on, r.review_months);
    return !p || p < h;
  };
  const resumo = {
    atende: aplicaveis.filter((r) => r.status === "atende").length,
    pendentes: aplicaveis.filter((r) => r.status === "nao_atende" || r.status === "atende_parcial").length,
    reavaliar: aplicaveis.filter(vencida).length,
  };
  const lista = todos.filter(
    (r) =>
      (!area || r.area === area) &&
      (!situacao ||
        (situacao === "reavaliar" ? r.applicable && vencida(r) : situacao === "nao_aplica" ? !r.applicable : r.applicable && r.status === situacao)),
  );
  const filtro = (a?: string, s?: string) => {
    const q = new URLSearchParams();
    if (a) q.set("area", a);
    if (s) q.set("situacao", s);
    return `/app/requisitos${q.size ? `?${q}` : ""}`;
  };
  const chip = (ativo: boolean) =>
    `rounded-full border px-3 py-1 ${ativo ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white"}`;

  return (
    <div>
      <h1 className="titulo">Requisitos legais</h1>
      <p className="mt-1 text-sm text-slate-600">
        A lista das leis, normas e licenças que se aplicam à empresa, com a avaliação periódica de atendimento e as
        evidências. O que não for atendido vira ação no plano &quot;Requisitos legais&quot;.
      </p>
      <Erro mensagem={erro} />
      <AvisoBanco erros={[falha]} script="0016_requisitos_legais.sql" />
      {ok && (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {ok === "0" ? "A lista básica já estava toda incluída." : `${ok} requisito(s) incluído(s). Revise e marque o que não se aplica.`}
        </p>
      )}

      {aplicaveis.length > 0 && (
        <p className="mt-4 text-sm text-slate-700">
          {aplicaveis.length} aplicáveis · {resumo.atende} atendem · {resumo.pendentes} com pendência · {resumo.reavaliar}{" "}
          para avaliar ou reavaliar
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Link href={filtro(undefined, situacao)} className={chip(!area)}>Todas as áreas</Link>
        {Object.entries(AREAS_LEGAIS).map(([k, l]) => (
          <Link key={k} href={filtro(k, situacao)} className={chip(area === k)}>{l}</Link>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <Link href={filtro(area)} className={chip(!situacao)}>Todas as situações</Link>
        {Object.entries(SITUACAO_LEGAL).map(([k, s]) => (
          <Link key={k} href={filtro(area, k)} className={chip(situacao === k)}>{s.nome}</Link>
        ))}
        <Link href={filtro(area, "reavaliar")} className={chip(situacao === "reavaliar")}>Avaliação vencida</Link>
        <Link href={filtro(area, "nao_aplica")} className={chip(situacao === "nao_aplica")}>Não se aplica</Link>
      </div>

      <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
        {lista.map((r) => {
          const s = SITUACAO_LEGAL[r.status];
          const prox = proximaAvaliacao(r.last_evaluated_on, r.review_months);
          return (
            <li key={r.id} className={`px-4 py-3 ${r.applicable ? "" : "text-slate-400"}`}>
              <Link href={`/app/requisitos/${r.id}`} className="font-medium text-emerald-800 underline">
                {r.source} · {r.title}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500">{AREAS_LEGAIS[r.area]}</span>
                {r.applicable ? (
                  <>
                    <span className={`rounded px-2 py-0.5 ${s.cor}`}>{s.nome}</span>
                    <span className={prox && prox >= h ? "text-slate-500" : "text-red-700"}>
                      {r.last_evaluated_on ? `avaliado em ${dataBR(r.last_evaluated_on)} · próxima ${dataBR(prox)}` : "nunca avaliado"}
                    </span>
                  </>
                ) : (
                  <span>não se aplica</span>
                )}
              </div>
            </li>
          );
        })}
        {!lista.length && (
          <li className="px-4 py-6 text-center text-slate-500">
            {todos.length ? "Nada com este filtro." : "Nenhum requisito ainda. Comece pela lista básica abaixo."}
          </li>
        )}
      </ul>

      <form action={carregarListaBasica} className="mt-4">
        <button className="btn">Incluir a lista básica (NRs e legislação ambiental federal)</button>
        <span className="ml-3 text-xs text-slate-500">
          Não substitui a análise da empresa: inclua leis estaduais, municipais e as condicionantes da sua licença.
        </span>
      </form>

      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-medium text-emerald-800">+ Novo requisito</summary>
        <form action={criarRequisito} className="mt-2 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-2">
          <CamposRequisito
            setores={setores}
            pessoas={(trabalhadores ?? []).map((t) => ({ id: t.id, label: t.full_name }))}
          />
          <div className="sm:col-span-2">
            <button className="btn">Criar requisito</button>
          </div>
        </form>
      </details>
    </div>
  );
}
