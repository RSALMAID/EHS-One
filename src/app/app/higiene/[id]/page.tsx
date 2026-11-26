import Link from "next/link";
import { notFound } from "next/navigation";
import { Erro } from "@/components/Erro";
import { dataBR, hoje } from "@/lib/datas";
import { situacaoExposicao, TIPOS_AGENTE } from "@/lib/higiene";
import { requireOrg } from "@/lib/org";
import { opcoesSetor } from "@/lib/setores";
import { createClient } from "@/lib/supabase/server";
import { abrirAcaoExposicao, adicionarAvaliacao, removerAvaliacao, salvarGhe } from "../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ok?: string }> };

export default async function GhePage({ params, searchParams }: Props) {
  const [{ id }, { erro, ok }] = await Promise.all([params, searchParams]);
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: g }, { data: medicoes }, { data: acoes }, setores] = await Promise.all([
    supabase.from("exposure_groups").select("*").eq("id", id).maybeSingle(),
    supabase.from("exposure_assessments").select("*").eq("group_id", id).order("measured_on", { ascending: false }),
    supabase.from("actions").select("origin_ref, number").eq("organization_id", org.id).eq("origin", "pgr"),
    opcoesSetor(org.id),
  ]);
  if (!g) notFound();
  const acaoDe = new Map((acoes ?? []).map((a) => [a.origin_ref, a.number]));

  return (
    <div>
      <Link href="/app/higiene" className="text-sm text-emerald-700 underline">← Higiene ocupacional</Link>
      <h1 className="mt-3 text-xl font-bold">GHE · {g.name}</h1>
      <Erro mensagem={erro} />
      {ok && (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Ação aberta no plano de ação do PGR.
        </p>
      )}

      <h2 className="mt-6 font-semibold">Medições</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse rounded-lg bg-white text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-2 py-1">Data</th>
              <th className="px-2 py-1">Agente</th>
              <th className="px-2 py-1">Resultado</th>
              <th className="px-2 py-1">Nível de ação / Limite</th>
              <th className="px-2 py-1">Situação</th>
              <th className="px-2 py-1">Método</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(medicoes ?? []).map((m) => {
              const s = situacaoExposicao(Number(m.result), m.limit_value, m.action_level);
              const numeroAcao = acaoDe.get(m.id);
              return (
                <tr key={m.id} className="border-b border-slate-100 align-top">
                  <td className="px-2 py-1">{dataBR(m.measured_on)}</td>
                  <td className="px-2 py-1">
                    {m.agent} <span className="text-xs text-slate-500">({TIPOS_AGENTE[m.agent_type]})</span>
                  </td>
                  <td className="px-2 py-1">{m.result} {m.unit}</td>
                  <td className="px-2 py-1">{m.action_level ?? "—"} / {m.limit_value ?? "—"}</td>
                  <td className="px-2 py-1">
                    <span className={`rounded px-2 py-0.5 text-xs ${s.cor}`}>{s.texto}</span>
                  </td>
                  <td className="px-2 py-1 text-xs text-slate-600">
                    {[m.method, m.equipment, m.evaluator].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-2 py-1 text-right">
                    <span className="inline-flex gap-3">
                      {s.ordem < 2 &&
                        (numeroAcao ? (
                          <span className="text-xs text-emerald-700">ação #{String(numeroAcao).padStart(4, "0")}</span>
                        ) : (
                          <form action={abrirAcaoExposicao}>
                            <input type="hidden" name="id" value={m.id} />
                            <input type="hidden" name="ghe" value={g.id} />
                            <input
                              type="hidden"
                              name="problema"
                              value={`${g.name}: ${m.agent} ${m.result} ${m.unit} (${s.texto}) em ${dataBR(m.measured_on)}`}
                            />
                            <button className="text-xs text-emerald-700 hover:underline">Abrir ação</button>
                          </form>
                        ))}
                      <form action={removerAvaliacao}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="ghe" value={g.id} />
                        <button className="text-xs text-red-600 hover:underline">Excluir</button>
                      </form>
                    </span>
                  </td>
                </tr>
              );
            })}
            {!medicoes?.length && (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-slate-500">Nenhuma medição ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form action={adicionarAvaliacao} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-4">
        <input type="hidden" name="ghe" value={g.id} />
        <p className="font-medium sm:col-span-4">Nova medição</p>
        <label className="sm:col-span-2">
          Agente
          <input name="agente" required className="input mt-1" placeholder="Ex.: Ruído contínuo, Sílica, Calor" />
        </label>
        <label>
          Tipo
          <select name="tipo" className="input mt-1">
            {Object.entries(TIPOS_AGENTE).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Data
          <input name="data" type="date" defaultValue={hoje()} className="input mt-1" />
        </label>
        <label>
          Resultado
          <input name="resultado" required inputMode="decimal" className="input mt-1" />
        </label>
        <label>
          Unidade
          <input name="unidade" required className="input mt-1" placeholder="dB(A), mg/m³, °C…" />
        </label>
        <label>
          Nível de ação
          <input name="nivel" inputMode="decimal" className="input mt-1" placeholder="Ex.: 82" />
        </label>
        <label>
          Limite de tolerância
          <input name="limite" inputMode="decimal" className="input mt-1" placeholder="Ex.: 85" />
        </label>
        <label>
          Método
          <input name="metodo" className="input mt-1" placeholder="Ex.: NHO-01" />
        </label>
        <label>
          Equipamento
          <input name="equipamento" className="input mt-1" />
        </label>
        <label className="sm:col-span-2">
          Avaliador
          <input name="avaliador" className="input mt-1" />
        </label>
        <label className="sm:col-span-4">
          Observações
          <input name="obs" className="input mt-1" />
        </label>
        <div className="sm:col-span-4">
          <button className="btn">Registrar medição</button>
        </div>
      </form>

      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-medium text-emerald-800">Editar GHE</summary>
        <form action={salvarGhe} className="mt-2 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-2">
          <input type="hidden" name="id" value={g.id} />
          <label>
            Nome
            <input name="nome" required defaultValue={g.name} className="input mt-1" />
          </label>
          <label>
            Setor
            <select name="setor" defaultValue={g.sector_id ?? ""} className="input mt-1">
              <option value="">—</option>
              {setores.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            Atividades
            <textarea name="atividades" rows={2} defaultValue={g.activities ?? ""} className="input mt-1" />
          </label>
          <label>
            Número de trabalhadores
            <input name="pessoas" type="number" min={0} defaultValue={g.workers_count ?? ""} className="input mt-1" />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="ativo" defaultChecked={g.active} /> Em uso
          </label>
          <div className="sm:col-span-2">
            <button className="btn">Salvar</button>
          </div>
        </form>
      </details>
    </div>
  );
}
