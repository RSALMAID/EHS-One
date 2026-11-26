import Link from "next/link";
import { notFound } from "next/navigation";
import { Erro } from "@/components/Erro";
import { CamposRequisito } from "@/components/FormRequisito";
import { dataBR, hoje, somarDias } from "@/lib/datas";
import { requireOrg } from "@/lib/org";
import { AREAS_LEGAIS, proximaAvaliacao, SITUACAO_LEGAL } from "@/lib/requisitos";
import { opcoesSetor } from "@/lib/setores";
import { createClient } from "@/lib/supabase/server";
import { avaliarRequisito, excluirRequisito, removerAvaliacao, salvarRequisito } from "../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ok?: string }> };

type Avaliacao = {
  id: string;
  evaluated_on: string;
  status: string;
  evidence: string | null;
  evaluator: string | null;
  actions: { number: number; plan_id: string; status: string } | null;
};

export default async function RequisitoPage({ params, searchParams }: Props) {
  const [{ id }, { erro, ok }] = await Promise.all([params, searchParams]);
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: r }, { data: av }, setores, { data: trabalhadores }] = await Promise.all([
    supabase.from("legal_requirements").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("legal_evaluations")
      .select("id, evaluated_on, status, evidence, evaluator, actions(number, plan_id, status)")
      .eq("requirement_id", id)
      .order("evaluated_on", { ascending: false })
      .order("created_at", { ascending: false }),
    opcoesSetor(org.id),
    supabase.from("workers").select("id, full_name").eq("organization_id", org.id).eq("active", true).order("full_name"),
  ]);
  if (!r) notFound();
  const avaliacoes = (av ?? []) as unknown as Avaliacao[];
  const s = SITUACAO_LEGAL[r.status];
  const prox = proximaAvaliacao(r.last_evaluated_on, r.review_months);
  const h = hoje();

  return (
    <div>
      <Link href="/app/requisitos" className="text-sm text-emerald-700 underline">← Requisitos legais</Link>
      <h1 className="mt-3 text-xl font-bold">{r.source} · {r.title}</h1>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-500">{AREAS_LEGAIS[r.area]}</span>
        {r.applicable ? (
          <>
            <span className={`rounded px-2 py-0.5 text-xs ${s.cor}`}>{s.nome}</span>
            <span className={prox && prox >= h ? "text-slate-500" : "text-red-700"}>
              {prox ? `próxima avaliação ${dataBR(prox)}` : "ainda não avaliado"}
            </span>
          </>
        ) : (
          <span className="text-slate-500">não se aplica à empresa</span>
        )}
      </div>
      {r.requirement && <p className="mt-2 text-sm text-slate-700">{r.requirement}</p>}
      <Erro mensagem={erro} />
      {ok && (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {ok === "acao" ? "Avaliação registrada e ação aberta no plano Requisitos legais." : "Salvo."}
        </p>
      )}

      {r.applicable && (
        <>
          <h2 className="mt-6 font-semibold">Nova avaliação de atendimento</h2>
          <form action={avaliarRequisito} className="mt-2 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-3">
            <input type="hidden" name="id" value={id} />
            <label>
              Data
              <input name="data" type="date" defaultValue={h} className="input mt-1" />
            </label>
            <label>
              Situação
              <select name="situacao" required className="input mt-1" defaultValue="">
                <option value="" disabled>Escolha…</option>
                <option value="atende">Atende</option>
                <option value="atende_parcial">Atende parcialmente</option>
                <option value="nao_atende">Não atende</option>
              </select>
            </label>
            <label>
              Avaliador
              <input name="avaliador" className="input mt-1" />
            </label>
            <label className="sm:col-span-3">
              Evidência ou constatação
              <textarea name="evidencia" rows={2} className="input mt-1" placeholder="Ex.: PGR revisão 3 de 10/2026; LO nº 123 válida até 2028; falta o laudo de…" />
            </label>
            <fieldset className="rounded border border-slate-200 p-3 sm:col-span-3">
              <label className="flex items-center gap-2 font-medium">
                <input type="checkbox" name="abrir_acao" defaultChecked /> Se não atender, abrir ação no plano de ação
              </label>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <label className="sm:col-span-2">
                  Ação
                  <input name="acao" className="input mt-1" placeholder="Adequar a empresa ao requisito legal" />
                </label>
                <label>
                  Prazo
                  <input name="prazo" type="date" defaultValue={somarDias(h, 30)} className="input mt-1" />
                </label>
              </div>
            </fieldset>
            <div className="sm:col-span-3">
              <button className="btn">Registrar avaliação</button>
            </div>
          </form>
        </>
      )}

      <h2 className="mt-8 font-semibold">Histórico de avaliações</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {avaliacoes.map((a) => (
          <li key={a.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{dataBR(a.evaluated_on)}</span>
              <span className={`rounded px-2 py-0.5 text-xs ${SITUACAO_LEGAL[a.status].cor}`}>{SITUACAO_LEGAL[a.status].nome}</span>
              {a.evaluator && <span className="text-slate-500">por {a.evaluator}</span>}
              {a.actions && (
                <Link href={`/app/acoes/plano/${a.actions.plan_id}`} className="text-emerald-700 underline">
                  ação #{String(a.actions.number).padStart(4, "0")}
                </Link>
              )}
              <form action={removerAvaliacao} className="ml-auto">
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="requisito" value={id} />
                <button className="text-xs text-red-700 underline">remover</button>
              </form>
            </div>
            {a.evidence && <p className="mt-1 text-slate-600">{a.evidence}</p>}
          </li>
        ))}
        {!avaliacoes.length && <li className="px-4 py-6 text-center text-slate-500">Nenhuma avaliação ainda.</li>}
      </ul>

      <details className="mt-8">
        <summary className="cursor-pointer text-sm font-medium text-emerald-800">Editar requisito</summary>
        <form action={salvarRequisito} className="mt-2 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
          <input type="hidden" name="id" value={id} />
          <CamposRequisito
            v={r}
            setores={setores}
            pessoas={(trabalhadores ?? []).map((t) => ({ id: t.id, label: t.full_name }))}
          />
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" name="aplicavel" defaultChecked={r.applicable} /> Este requisito se aplica à empresa
          </label>
          <div className="sm:col-span-2">
            <button className="btn">Salvar</button>
          </div>
        </form>
        <form action={excluirRequisito} className="mt-3">
          <input type="hidden" name="id" value={id} />
          <button className="text-sm text-red-700 underline">Excluir este requisito e o histórico</button>
        </form>
      </details>
    </div>
  );
}
