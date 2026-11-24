import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { criarAcao, mudarStatus } from "./actions";

const ORIGENS: Record<string, string> = {
  pgr: "PGR",
  inspecao: "Inspeção",
  ocorrencia: "Ocorrência",
  auditoria: "Auditoria",
  ergonomia: "Ergonomia",
  dds: "DDS",
  treinamento: "Treinamento",
  documento: "Documento",
  observacao: "Observação",
  requisito_legal: "Requisito legal",
  vencimento: "Vencimento",
  outro: "Outro",
};

const STATUS: Record<string, string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  aguardando_validacao: "Aguardando validação",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

function situacao(due: string | null, status: string, hoje: string) {
  if (status === "concluida" || status === "cancelada") return { cor: "bg-emerald-500", texto: "Encerrada" };
  if (!due) return { cor: "bg-slate-300", texto: "Sem prazo" };
  if (due < hoje) return { cor: "bg-red-500", texto: "Atrasada" };
  const semana = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  if (due <= semana) return { cor: "bg-amber-500", texto: "Vence esta semana" };
  return { cor: "bg-emerald-500", texto: "No prazo" };
}

export default async function AcoesPage() {
  const org = await requireOrg();
  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);

  const [{ data: acoes }, { data: trabalhadores }] = await Promise.all([
    supabase
      .from("actions")
      .select("id, number, origin, problem, action, due_date, status, workers(full_name)")
      .eq("organization_id", org.id)
      .order("number", { ascending: false }),
    supabase
      .from("workers")
      .select("id, full_name")
      .eq("organization_id", org.id)
      .eq("active", true)
      .order("full_name"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Central de Ações</h1>
      <p className="mt-1 text-sm text-slate-600">
        Origem → problema → ação → responsável → prazo → evidência → validação → encerramento.
      </p>

      <form action={criarAcao} className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <label className="text-sm">
          Problema
          <input name="problema" required className="input mt-1" placeholder="Esmeril sem proteção" />
        </label>
        <label className="text-sm">
          Ação
          <input name="acao" required className="input mt-1" placeholder="Instalar proteção fixa" />
        </label>
        <label className="text-sm">
          Origem
          <select name="origem" className="input mt-1" defaultValue="outro">
            {Object.entries(ORIGENS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Responsável
          <select name="responsavel" className="input mt-1" defaultValue="">
            <option value="">—</option>
            {(trabalhadores ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Prazo
          <input name="prazo" type="date" className="input mt-1" />
        </label>
        <div className="flex items-end">
          <button className="btn w-full sm:w-auto">Criar ação</button>
        </div>
      </form>

      <ul className="mt-6 space-y-2">
        {(acoes ?? []).map((a) => {
          const s = situacao(a.due_date, a.status, hoje);
          const resp = (a.workers as unknown as { full_name: string } | null)?.full_name;
          return (
            <li key={a.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">
                    #{String(a.number).padStart(4, "0")} · {ORIGENS[a.origin] ?? a.origin}
                  </p>
                  <p className="mt-1 font-medium">{a.action}</p>
                  <p className="text-sm text-slate-600">{a.problem}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {resp ?? "Sem responsável"} · {a.due_date ? `prazo ${a.due_date.split("-").reverse().join("/")}` : "sem prazo"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className={`h-2.5 w-2.5 rounded-full ${s.cor}`} /> {s.texto}
                  </span>
                  <form action={mudarStatus} className="flex gap-2">
                    <input type="hidden" name="id" value={a.id} />
                    <select name="status" defaultValue={a.status} className="input py-1 text-xs">
                      {Object.entries(STATUS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <button className="btn-ghost px-2 py-1 text-xs">Salvar</button>
                  </form>
                </div>
              </div>
            </li>
          );
        })}
        {!acoes?.length && (
          <li className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Nenhuma ação ainda. Elas também nascerão de inspeções, ocorrências e do PGR.
          </li>
        )}
      </ul>
    </div>
  );
}
