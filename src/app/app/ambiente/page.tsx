import Link from "next/link";
import { Erro } from "@/components/Erro";
import { dataBR, hoje } from "@/lib/datas";
import { CLASSES_RESIDUO, CONDICOES, significancia, UNIDADES_RESIDUO } from "@/lib/higiene";
import { requireOrg } from "@/lib/org";
import { PROBABILIDADE, SEVERIDADE } from "@/lib/risco";
import { opcoesSetor } from "@/lib/setores";
import { createClient } from "@/lib/supabase/server";
import { adicionarAspecto, registrarResiduo, removerAspecto, removerResiduo } from "../higiene/actions";

type Props = { searchParams: Promise<{ erro?: string; aba?: string }> };

export default async function AmbientePage({ searchParams }: Props) {
  const { erro, aba = "aspectos" } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: aspectos }, { data: residuos }, setores] = await Promise.all([
    supabase
      .from("env_aspects")
      .select("id, activity, aspect, impact, condition, severity, probability, significance, legal_requirement, controls, sectors(name)")
      .eq("organization_id", org.id)
      .order("significance", { ascending: false }),
    supabase
      .from("waste_records")
      .select("id, recorded_on, waste, waste_class, quantity, unit, destination, transporter, mtr_number")
      .eq("organization_id", org.id)
      .order("recorded_on", { ascending: false })
      .limit(300),
    opcoesSetor(org.id),
  ]);
  const listaAspectos = (aspectos ?? []) as unknown as {
    id: string;
    activity: string;
    aspect: string;
    impact: string;
    condition: string;
    severity: number;
    probability: number;
    significance: number;
    legal_requirement: string | null;
    controls: string | null;
    sectors: { name: string } | null;
  }[];
  const ano = hoje().slice(0, 4);
  const totais = new Map<string, number>();
  for (const r of residuos ?? []) {
    if (!r.recorded_on.startsWith(ano)) continue;
    const k = `${CLASSES_RESIDUO[r.waste_class]} (${r.unit})`;
    totais.set(k, (totais.get(k) ?? 0) + Number(r.quantity));
  }
  const chip = (ativo: boolean) =>
    `rounded-full border px-3 py-1 ${ativo ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-slate-300"}`;
  const setorSelect = (
    <select name="setor" className="input mt-1" defaultValue="">
      <option value="">—</option>
      {setores.map((s) => (
        <option key={s.id} value={s.id}>{s.label}</option>
      ))}
    </select>
  );

  return (
    <div>
      <h1 className="titulo">Meio ambiente</h1>
      <p className="mt-1 text-sm text-slate-600">
        Aspectos e impactos ambientais (LAIA) com significância, e o registro dos resíduos gerados e para onde foram.
        Licenças ambientais ficam em Documentos, com validade.
      </p>
      <Erro mensagem={erro} />
      <div className="mt-4 flex gap-2 text-sm">
        <Link href="/app/ambiente" className={chip(aba === "aspectos")}>Aspectos e impactos</Link>
        <Link href="/app/ambiente?aba=residuos" className={chip(aba === "residuos")}>Resíduos</Link>
      </div>

      {aba === "aspectos" ? (
        <>
          <ul className="mt-4 space-y-2">
            {listaAspectos.map((a) => {
              const s = significancia(a.significance);
              return (
                <li key={a.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium">
                      {a.activity}: {a.aspect} → {a.impact}
                    </p>
                    <span className={`rounded px-2 py-0.5 text-xs ${s.cor}`}>{s.texto} ({a.significance})</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {CONDICOES[a.condition]}
                    {a.sectors ? ` · ${a.sectors.name}` : ""} · severidade {a.severity} × probabilidade {a.probability}
                    {a.legal_requirement ? ` · ${a.legal_requirement}` : ""}
                  </p>
                  {a.controls && <p className="mt-1"><span className="text-slate-500">Controles:</span> {a.controls}</p>}
                  <form action={removerAspecto} className="mt-1">
                    <input type="hidden" name="id" value={a.id} />
                    <button className="text-xs text-red-600 hover:underline">Excluir</button>
                  </form>
                </li>
              );
            })}
            {!listaAspectos.length && <li className="text-sm text-slate-500">Nenhum aspecto levantado ainda.</li>}
          </ul>
          <form action={adicionarAspecto} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-2">
            <p className="font-medium sm:col-span-2">Novo aspecto</p>
            <label>
              Atividade
              <input name="atividade" required className="input mt-1" placeholder="Ex.: troca de óleo das máquinas" />
            </label>
            <label>
              Setor
              {setorSelect}
            </label>
            <label>
              Aspecto
              <input name="aspecto" required className="input mt-1" placeholder="Ex.: geração de resíduo oleoso" />
            </label>
            <label>
              Impacto
              <input name="impacto" required className="input mt-1" placeholder="Ex.: contaminação do solo" />
            </label>
            <label>
              Condição
              <select name="condicao" className="input mt-1">
                {Object.entries(CONDICOES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                Severidade
                <select name="severidade" required className="input mt-1" defaultValue="">
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{SEVERIDADE[n]}</option>
                  ))}
                </select>
              </label>
              <label>
                Probabilidade
                <select name="probabilidade" required className="input mt-1" defaultValue="">
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{PROBABILIDADE[n]}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Requisito legal (opcional)
              <input name="requisito" className="input mt-1" placeholder="Ex.: Resolução CONAMA 362" />
            </label>
            <label>
              Controles
              <input name="controles" className="input mt-1" />
            </label>
            <div className="sm:col-span-2">
              <button className="btn">Adicionar aspecto</button>
            </div>
          </form>
        </>
      ) : (
        <>
          {totais.size > 0 && (
            <p className="mt-4 text-sm">
              <strong>Total em {ano}:</strong>{" "}
              {[...totais.entries()].map(([k, v]) => `${k}: ${v.toLocaleString("pt-BR")}`).join(" · ")}
            </p>
          )}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse rounded-lg bg-white text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-2 py-1">Data</th>
                  <th className="px-2 py-1">Resíduo</th>
                  <th className="px-2 py-1">Classe</th>
                  <th className="px-2 py-1">Quantidade</th>
                  <th className="px-2 py-1">Destino</th>
                  <th className="px-2 py-1">MTR</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(residuos ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="px-2 py-1">{dataBR(r.recorded_on)}</td>
                    <td className="px-2 py-1">{r.waste}</td>
                    <td className="px-2 py-1">{r.waste_class}</td>
                    <td className="px-2 py-1">{Number(r.quantity).toLocaleString("pt-BR")} {r.unit}</td>
                    <td className="px-2 py-1">{[r.destination, r.transporter].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="px-2 py-1">{r.mtr_number ?? "—"}</td>
                    <td className="px-2 py-1 text-right">
                      <form action={removerResiduo}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="text-xs text-red-600 hover:underline">Excluir</button>
                      </form>
                    </td>
                  </tr>
                ))}
                {!residuos?.length && (
                  <tr>
                    <td colSpan={7} className="px-2 py-4 text-center text-slate-500">Nenhum registro ainda.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <form action={registrarResiduo} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-4">
            <p className="font-medium sm:col-span-4">Registrar saída de resíduo</p>
            <label className="sm:col-span-2">
              Resíduo
              <input name="residuo" required className="input mt-1" placeholder="Ex.: estopa contaminada com óleo" />
            </label>
            <label>
              Classe
              <select name="classe" className="input mt-1" defaultValue="IIA">
                {Object.entries(CLASSES_RESIDUO).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Data
              <input name="data" type="date" defaultValue={hoje()} className="input mt-1" />
            </label>
            <label>
              Quantidade
              <input name="quantidade" required inputMode="decimal" className="input mt-1" />
            </label>
            <label>
              Unidade
              <select name="unidade" className="input mt-1">
                {UNIDADES_RESIDUO.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>
            <label>
              Destino
              <input name="destino" className="input mt-1" placeholder="Ex.: coprocessamento" />
            </label>
            <label>
              Transportador
              <input name="transportador" className="input mt-1" />
            </label>
            <label>
              Nº do MTR
              <input name="mtr" className="input mt-1" />
            </label>
            <label>
              Setor
              {setorSelect}
            </label>
            <div className="sm:col-span-4">
              <button className="btn">Registrar</button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
