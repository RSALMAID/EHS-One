import { Erro } from "@/components/Erro";
import { dataBR, hoje } from "@/lib/datas";
import { catalogo } from "@/lib/planos";
import { createClient } from "@/lib/supabase/server";
import { mudarPlano, responderPedido, salvarModulos } from "./actions";

type Props = { searchParams: Promise<{ erro?: string; ok?: string }> };

type Empresa = {
  id: string;
  name: string;
  plan: string;
  trial_ends_at: string;
  created_at: string;
  members: number;
  workers: number;
  pending_requests: number;
  extra_modules: string[];
  removed_modules: string[];
};

export default async function AdminPage({ searchParams }: Props) {
  const { erro, ok } = await searchParams;
  const supabase = await createClient();
  const [{ data: e, error }, { planos, modulos, inclui }, { data: pedidos }] = await Promise.all([
    supabase.rpc("admin_organizations"),
    catalogo(),
    supabase
      .from("plan_requests")
      .select("id, organization_id, requested_plan, note, created_at")
      .eq("status", "pendente")
      .order("created_at"),
  ]);
  const empresas = (e ?? []) as Empresa[];
  const nome = new Map(empresas.map((x) => [x.id, x.name]));
  const nomePlano = (c: string) => planos.find((p) => p.code === c)?.name ?? c;
  const h = hoje();

  return (
    <div>
      <h1 className="titulo">Empresas e planos</h1>
      <p className="subtitulo">
        Mude o plano, o prazo do teste e libere ou tire módulos de cada empresa. O cliente não consegue mudar o próprio
        plano; ele faz um pedido, que aparece aqui.
      </p>
      <Erro mensagem={erro ?? error?.message} />
      {ok && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Salvo.</p>}

      <h2 className="mt-6 font-semibold text-slate-900">Pedidos de mudança de plano</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
        {(pedidos ?? []).map((p) => (
          <li key={p.id} className="px-4 py-3">
            <p>
              <strong>{nome.get(p.organization_id) ?? "Empresa"}</strong> quer o plano <strong>{nomePlano(p.requested_plan)}</strong>
              <span className="text-slate-500"> · {dataBR(p.created_at.slice(0, 10))}</span>
            </p>
            {p.note && <p className="text-slate-600">{p.note}</p>}
            <form action={responderPedido} className="mt-2 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={p.id} />
              <input name="resposta" className="input max-w-md" placeholder="Resposta para o cliente (opcional)" />
              <button name="status" value="atendido" className="btn">Marcar como atendido</button>
              <button name="status" value="cancelado" className="btn-ghost">Cancelar</button>
            </form>
            <p className="mt-1 text-xs text-slate-500">Mude o plano da empresa abaixo antes de marcar como atendido.</p>
          </li>
        ))}
        {!pedidos?.length && <li className="px-4 py-4 text-center text-slate-500">Nenhum pedido aguardando.</li>}
      </ul>

      <h2 className="mt-8 font-semibold text-slate-900">Empresas ({empresas.length})</h2>
      <ul className="mt-2 space-y-3">
        {empresas.map((x) => {
          const fimTeste = x.trial_ends_at.slice(0, 10);
          const vencido = x.plan === "teste" && fimTeste < h;
          const estado = (m: string) =>
            x.extra_modules.includes(m) ? "liberar" : x.removed_modules.includes(m) ? "tirar" : "plano";
          return (
            <li key={x.id} className="card text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{x.name}</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{nomePlano(x.plan)}</span>
                {x.plan === "teste" && (
                  <span className={`rounded px-2 py-0.5 text-xs ${vencido ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                    {vencido ? `teste vencido em ${dataBR(fimTeste)}` : `teste até ${dataBR(fimTeste)}`}
                  </span>
                )}
                {x.pending_requests > 0 && <span className="rounded bg-sky-100 px-2 py-0.5 text-xs text-sky-800">pedido pendente</span>}
              </div>
              <p className="mt-1 text-slate-500">
                Desde {dataBR(x.created_at.slice(0, 10))} · {x.members} login(s) · {x.workers} trabalhador(es) ativo(s)
                {x.extra_modules.length ? ` · extras: ${x.extra_modules.join(", ")}` : ""}
                {x.removed_modules.length ? ` · tirados: ${x.removed_modules.join(", ")}` : ""}
              </p>
              <form action={mudarPlano} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="org" value={x.id} />
                <label className="text-xs">
                  Plano
                  <select name="plano" defaultValue={x.plan} className="input mt-1">
                    {planos.map((p) => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs">
                  Teste até (só para o plano Teste)
                  <input name="teste_ate" type="date" defaultValue={fimTeste} className="input mt-1" />
                </label>
                <button className="btn">Salvar plano</button>
              </form>
              <details className="mt-3">
                <summary className="cursor-pointer text-emerald-800">Módulos desta empresa</summary>
                <form action={salvarModulos} className="mt-2">
                  <input type="hidden" name="org" value={x.id} />
                  <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                    {modulos.map((m) => (
                      <label key={m.code} className="flex items-center justify-between gap-2 rounded border border-slate-100 px-2 py-1">
                        <span>
                          {m.name}
                          <span className="ml-1 text-xs text-slate-400">{inclui(x.plan, m.code) ? "(no plano)" : ""}</span>
                        </span>
                        <input type="hidden" name={`a_${m.code}`} value={estado(m.code)} />
                        <select name={`m_${m.code}`} defaultValue={estado(m.code)} className="input w-32 py-1">
                          <option value="plano">Pelo plano</option>
                          <option value="liberar">Liberar</option>
                          <option value="tirar">Tirar</option>
                        </select>
                      </label>
                    ))}
                  </div>
                  <button className="btn mt-3">Salvar módulos</button>
                </form>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
