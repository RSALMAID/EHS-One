import { dataBR } from "@/lib/datas";
import { numero, ORIGENS, prazo, STATUS_ACAO } from "@/lib/acoes";
import { adicionarEvidencia, avaliarEficacia, mudarStatus, removerEvidencia } from "@/app/app/acoes/actions";

export type AcaoLinha = {
  id: string;
  number: number;
  origin: string;
  problem: string;
  action: string;
  due_date: string | null;
  status: string;
  evidence_required: string | null;
  efficacy_result: string | null;
  efficacy_notes: string | null;
  workers: { full_name: string } | null;
  action_plans?: { id: string; number: number; title: string } | null;
};
export type Evidencia = { id: string; action_id: string; note: string | null; file_name: string | null; url?: string | null; created_at: string };

export const CAMPOS_ACAO =
  "id, number, origin, problem, action, due_date, status, evidence_required, efficacy_result, efficacy_notes, workers(full_name)";

export function AcaoCard({ a, evidencias, voltar, plano }: { a: AcaoLinha; evidencias: Evidencia[]; voltar: string; plano?: boolean }) {
  const s = prazo(a.due_date, a.status);
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">
            {numero(a.number)} · {ORIGENS[a.origin] ?? a.origin}
            {plano && a.action_plans && (
              <>
                {" · "}
                <a href={`/app/acoes/plano/${a.action_plans.id}`} className="underline">
                  Plano {numero(a.action_plans.number)} {a.action_plans.title}
                </a>
              </>
            )}
          </p>
          <p className="mt-1 font-medium">{a.action}</p>
          <p className="text-slate-600">{a.problem}</p>
          <p className="mt-1 text-xs text-slate-500">
            {a.workers?.full_name ?? "Sem responsável"} · {a.due_date ? `prazo ${dataBR(a.due_date)}` : "sem prazo"}
            {a.evidence_required ? ` · evidência pedida: ${a.evidence_required}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className={`h-2.5 w-2.5 rounded-full ${s.cor}`} /> {s.texto}
          </span>
          <form action={mudarStatus} className="flex gap-2">
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="voltar" value={voltar} />
            <select name="status" defaultValue={a.status} className="input py-1 text-xs">
              {Object.entries(STATUS_ACAO).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <button className="btn-ghost px-2 py-1 text-xs">Salvar</button>
          </form>
        </div>
      </div>

      <details className="mt-3" open={a.status === "aguardando_validacao"}>
        <summary className="cursor-pointer text-xs text-emerald-700">
          Evidências ({evidencias.length}){a.status === "concluida" ? " e eficácia" : ""}
        </summary>
        <ul className="mt-2 space-y-1">
          {evidencias.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-2 rounded bg-slate-50 px-2 py-1 text-xs">
              <span>
                {new Date(e.created_at).toLocaleDateString("pt-BR")} · {e.note}
                {e.url && (
                  <a href={e.url} target="_blank" rel="noreferrer" className="ml-1 text-emerald-700 underline">
                    {e.file_name ?? "arquivo"}
                  </a>
                )}
              </span>
              <form action={removerEvidencia}>
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="voltar" value={voltar} />
                <button className="text-red-600 hover:underline">remover</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={adicionarEvidencia} className="mt-2 grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
          <input type="hidden" name="id" value={a.id} />
          <input type="hidden" name="voltar" value={voltar} />
          <input name="nota" className="input py-1 text-xs" placeholder="O que foi feito" />
          <input name="arquivo" type="file" accept="image/*,application/pdf" className="text-xs" />
          <button className="btn-ghost px-2 py-1 text-xs">Anexar</button>
        </form>
        {a.status === "concluida" && (
          <form action={avaliarEficacia} className="mt-3 grid gap-2 border-t border-slate-100 pt-2 sm:grid-cols-[auto_2fr_auto] sm:items-center">
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="voltar" value={voltar} />
            <select name="resultado" defaultValue={a.efficacy_result ?? "eficaz"} className="input py-1 text-xs">
              <option value="eficaz">Eficaz</option>
              <option value="nao_eficaz">Não eficaz</option>
            </select>
            <input name="obs" defaultValue={a.efficacy_notes ?? ""} className="input py-1 text-xs" placeholder="Como verificou a eficácia" />
            <button className="btn-ghost px-2 py-1 text-xs">Registrar eficácia</button>
          </form>
        )}
        {a.efficacy_result && (
          <p className={`mt-1 text-xs ${a.efficacy_result === "eficaz" ? "text-emerald-700" : "text-red-700"}`}>
            Eficácia: {a.efficacy_result === "eficaz" ? "eficaz" : "não eficaz"}
            {a.efficacy_notes ? ` · ${a.efficacy_notes}` : ""}
          </p>
        )}
      </details>
    </li>
  );
}
