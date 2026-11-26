import Link from "next/link";
import { notFound } from "next/navigation";
import { Erro } from "@/components/Erro";
import { STATUS_ACAO } from "@/lib/acoes";
import { dataBR, hoje, somarDias } from "@/lib/datas";
import { NORMAS, numeroAuditoria, STATUS_AUDITORIA, TIPOS_AUDITORIA, TIPOS_CONSTATACAO } from "@/lib/iso";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { adicionarConstatacao, excluirAuditoria, removerConstatacao, salvarAuditoria } from "../../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ok?: string }> };

type Constatacao = {
  id: string;
  clause: string | null;
  kind: string;
  description: string;
  evidence: string | null;
  actions: { number: number; plan_id: string; status: string } | null;
};

const ORDEM = Object.keys(TIPOS_CONSTATACAO);

export default async function AuditoriaPage({ params, searchParams }: Props) {
  const [{ id }, { erro, ok }] = await Promise.all([params, searchParams]);
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: a }, { data: c }, { data: trabalhadores }] = await Promise.all([
    supabase.from("audits").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("audit_findings")
      .select("id, clause, kind, description, evidence, actions(number, plan_id, status)")
      .eq("audit_id", id)
      .order("created_at"),
    supabase.from("workers").select("id, full_name").eq("organization_id", org.id).eq("active", true).order("full_name"),
  ]);
  if (!a) notFound();
  const constatacoes = ((c ?? []) as unknown as Constatacao[]).sort((x, y) => ORDEM.indexOf(x.kind) - ORDEM.indexOf(y.kind));
  const h = hoje();

  return (
    <div>
      <Link href="/app/iso/auditorias" className="text-sm text-emerald-700 underline">← Auditorias</Link>
      <h1 className="mt-3 text-xl font-bold">
        {numeroAuditoria(a.number)} · Auditoria {TIPOS_AUDITORIA[a.kind].toLowerCase()} · {NORMAS[a.standard]}
      </h1>
      <p className="text-sm text-slate-600">
        {STATUS_AUDITORIA[a.status]} · {a.done_on ? `realizada em ${dataBR(a.done_on)}` : `planejada para ${dataBR(a.planned_on)}`}
        {a.auditor ? ` · ${a.auditor}` : ""}
      </p>
      <Erro mensagem={erro} />
      {ok && (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {ok === "acao" ? "Constatação registrada e ação aberta no plano desta auditoria." : "Salvo."}
        </p>
      )}

      <h2 className="mt-6 font-semibold">Constatações</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {constatacoes.map((f) => {
          const t = TIPOS_CONSTATACAO[f.kind];
          return (
            <li key={f.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs ${t.cor}`}>{t.nome}</span>
                {f.clause && <span className="text-slate-500">item {f.clause}</span>}
                {f.actions && (
                  <Link href={`/app/acoes/plano/${f.actions.plan_id}`} className="text-emerald-700 underline">
                    ação #{String(f.actions.number).padStart(4, "0")} · {STATUS_ACAO[f.actions.status]}
                  </Link>
                )}
                <form action={removerConstatacao} className="ml-auto">
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="auditoria" value={id} />
                  <button className="text-xs text-red-700 underline">remover</button>
                </form>
              </div>
              <p className="mt-1">{f.description}</p>
              {f.evidence && <p className="text-slate-500">Evidência: {f.evidence}</p>}
            </li>
          );
        })}
        {!constatacoes.length && <li className="px-4 py-6 text-center text-slate-500">Nenhuma constatação ainda.</li>}
      </ul>

      <form action={adicionarConstatacao} className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-3">
        <input type="hidden" name="auditoria" value={id} />
        <label>
          Tipo
          <select name="tipo" required className="input mt-1" defaultValue="">
            <option value="" disabled>Escolha…</option>
            {Object.entries(TIPOS_CONSTATACAO).map(([k, v]) => (
              <option key={k} value={k}>{v.nome}</option>
            ))}
          </select>
        </label>
        <label>
          Item da norma
          <input name="clausula" className="input mt-1" placeholder="Ex.: 7.2" />
        </label>
        <label>
          Evidência
          <input name="evidencia" className="input mt-1" placeholder="O que foi visto ou faltou" />
        </label>
        <label className="sm:col-span-3">
          Descrição
          <textarea name="descricao" required rows={2} className="input mt-1" />
        </label>
        <fieldset className="rounded border border-slate-200 p-3 sm:col-span-3">
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" name="abrir_acao" defaultChecked /> Abrir ação corretiva no plano desta auditoria (não vale para ponto forte)
          </label>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <label>
              Ação
              <input name="acao" className="input mt-1" placeholder="Analisar a causa e corrigir" />
            </label>
            <label>
              Responsável
              <select name="responsavel" className="input mt-1" defaultValue="">
                <option value="">—</option>
                {(trabalhadores ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </label>
            <label>
              Prazo
              <input name="prazo" type="date" defaultValue={somarDias(h, 30)} className="input mt-1" />
            </label>
          </div>
        </fieldset>
        <div className="sm:col-span-3">
          <button className="btn">Registrar constatação</button>
        </div>
      </form>

      <h2 className="mt-8 font-semibold">Dados da auditoria</h2>
      <form action={salvarAuditoria} className="mt-2 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-3">
        <input type="hidden" name="id" value={id} />
        <label>
          Norma
          <select name="norma" className="input mt-1" defaultValue={a.standard}>
            {Object.entries(NORMAS).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Situação
          <select name="status" className="input mt-1" defaultValue={a.status}>
            {Object.entries(STATUS_AUDITORIA).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Auditor(es)
          <input name="auditor" defaultValue={a.auditor ?? ""} className="input mt-1" />
        </label>
        <label>
          Data planejada
          <input name="data" type="date" defaultValue={a.planned_on} className="input mt-1" />
        </label>
        <label>
          Realizada em
          <input name="realizada" type="date" defaultValue={a.done_on ?? ""} className="input mt-1" />
        </label>
        <label>
          Escopo
          <input name="escopo" defaultValue={a.scope ?? ""} className="input mt-1" />
        </label>
        <label className="sm:col-span-3">
          Conclusão / relatório
          <textarea name="resumo" rows={4} defaultValue={a.summary ?? ""} className="input mt-1" />
        </label>
        <div className="sm:col-span-3">
          <button className="btn">Salvar</button>
        </div>
      </form>
      <form action={excluirAuditoria} className="mt-6">
        <input type="hidden" name="id" value={id} />
        <button className="text-sm text-red-700 underline">Excluir esta auditoria e as constatações</button>
      </form>
    </div>
  );
}
