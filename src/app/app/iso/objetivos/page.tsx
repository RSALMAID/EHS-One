import Link from "next/link";
import { Erro } from "@/components/Erro";
import { dataBR, hoje } from "@/lib/datas";
import { DIRECAO, metaAtingida, NORMAS, STATUS_OBJETIVO } from "@/lib/iso";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { criarObjetivo, excluirObjetivo, medirObjetivo, situacaoObjetivo } from "../actions";

type Props = { searchParams: Promise<{ erro?: string }> };

type Objetivo = {
  id: string;
  standard: string;
  title: string;
  indicator: string | null;
  unit: string | null;
  baseline: number | null;
  target: number | null;
  direction: string;
  due_on: string | null;
  status: string;
  workers: { full_name: string } | null;
  iso_objective_measurements: { measured_on: string; value: number; notes: string | null }[];
};

export default async function ObjetivosPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data }, { data: trabalhadores }] = await Promise.all([
    supabase
      .from("iso_objectives")
      .select("id, standard, title, indicator, unit, baseline, target, direction, due_on, status, workers(full_name), iso_objective_measurements(measured_on, value, notes)")
      .eq("organization_id", org.id)
      .order("created_at"),
    supabase.from("workers").select("id, full_name").eq("organization_id", org.id).eq("active", true).order("full_name"),
  ]);
  const objetivos = (data ?? []) as unknown as Objetivo[];
  const h = hoje();
  const num = (v: number | null) => (v === null ? "—" : Number(v).toLocaleString("pt-BR"));

  return (
    <div>
      <Link href="/app/iso" className="text-sm text-emerald-700 underline">← ISO 45001 e 14001</Link>
      <h1 className="mt-3 text-2xl font-bold">Objetivos e metas</h1>
      <p className="mt-1 text-sm text-slate-600">
        Cada objetivo precisa ser mensurável, ter prazo e responsável (item 6.2). Registre as medições ao longo do tempo
        para mostrar a evolução.
      </p>
      <Erro mensagem={erro} />

      <ul className="mt-4 space-y-3">
        {objetivos.map((o) => {
          const medicoes = [...o.iso_objective_measurements].sort((a, b) => a.measured_on.localeCompare(b.measured_on));
          const ultima = medicoes.at(-1);
          const ok = metaAtingida(o.direction, o.target === null ? null : Number(o.target), ultima ? Number(ultima.value) : null);
          const s = STATUS_OBJETIVO[o.status];
          const atrasado = o.status === "em_andamento" && o.due_on && o.due_on < h;
          return (
            <li key={o.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{o.title}</span>
                <span className={`rounded px-2 py-0.5 text-xs ${s.cor}`}>{s.nome}</span>
                <span className="text-xs text-slate-500">{NORMAS[o.standard]}</span>
              </div>
              <p className="mt-1 text-slate-600">
                {o.indicator ?? "Indicador"}: {DIRECAO[o.direction].toLowerCase()} {num(o.target)} {o.unit ?? ""}
                {o.baseline !== null ? ` (partiu de ${num(o.baseline)})` : ""}
                {o.due_on ? ` · prazo ${dataBR(o.due_on)}` : ""}
                {o.workers ? ` · ${o.workers.full_name}` : ""}
                {atrasado && <span className="ml-1 text-red-700">· prazo vencido</span>}
              </p>
              <p className="mt-1">
                {ultima ? (
                  <>
                    Última medição: <strong>{num(ultima.value)} {o.unit ?? ""}</strong> em {dataBR(ultima.measured_on)}
                    {ok !== null && (
                      <span className={`ml-2 rounded px-1.5 py-0.5 text-xs ${ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {ok ? "dentro da meta" : "fora da meta"}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500">Sem medições.</span>
                )}
              </p>
              {medicoes.length > 1 && (
                <p className="mt-1 text-xs text-slate-500">
                  Histórico: {medicoes.map((m) => `${dataBR(m.measured_on)}: ${num(m.value)}`).join(" · ")}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <form action={medirObjetivo} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={o.id} />
                  <label className="text-xs">
                    Data
                    <input name="data" type="date" defaultValue={h} className="input mt-1" />
                  </label>
                  <label className="text-xs">
                    Valor
                    <input name="valor" required inputMode="decimal" className="input mt-1 w-24" />
                  </label>
                  <button className="btn">Registrar medição</button>
                </form>
                <form action={situacaoObjetivo} className="flex items-end gap-2">
                  <input type="hidden" name="id" value={o.id} />
                  <select name="status" defaultValue={o.status} className="input">
                    {Object.entries(STATUS_OBJETIVO).map(([k, v]) => (
                      <option key={k} value={k}>{v.nome}</option>
                    ))}
                  </select>
                  <button className="text-xs text-emerald-700 underline">mudar situação</button>
                </form>
                <form action={excluirObjetivo}>
                  <input type="hidden" name="id" value={o.id} />
                  <button className="text-xs text-red-700 underline">excluir</button>
                </form>
              </div>
            </li>
          );
        })}
        {!objetivos.length && (
          <li className="rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-6 text-center text-sm text-slate-500">
            Nenhum objetivo ainda. Exemplos: reduzir a taxa de frequência para 5; reduzir em 20% o resíduo enviado a aterro.
          </li>
        )}
      </ul>

      <details className="mt-6" open={!objetivos.length}>
        <summary className="cursor-pointer text-sm font-medium text-emerald-800">+ Novo objetivo</summary>
        <form action={criarObjetivo} className="mt-2 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-3">
          <label className="sm:col-span-2">
            Objetivo
            <input name="titulo" required className="input mt-1" placeholder="Ex.: Reduzir acidentes com afastamento" />
          </label>
          <label>
            Norma
            <select name="norma" className="input mt-1" defaultValue="ambas">
              {Object.entries(NORMAS).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Indicador
            <input name="indicador" className="input mt-1" placeholder="Ex.: taxa de frequência" />
          </label>
          <label>
            Unidade
            <input name="unidade" className="input mt-1" placeholder="Ex.: %, kg, acidentes" />
          </label>
          <label>
            Valor de partida
            <input name="base" inputMode="decimal" className="input mt-1" />
          </label>
          <label>
            Meta
            <select name="direcao" className="input mt-1" defaultValue="reduzir">
              {Object.entries(DIRECAO).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Valor da meta
            <input name="meta" inputMode="decimal" className="input mt-1" />
          </label>
          <label>
            Prazo
            <input name="prazo" type="date" className="input mt-1" />
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
          <label className="sm:col-span-2">
            Como vai alcançar (recursos, ações)
            <input name="obs" className="input mt-1" />
          </label>
          <div className="sm:col-span-3">
            <button className="btn">Criar objetivo</button>
          </div>
        </form>
      </details>
    </div>
  );
}
