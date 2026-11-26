import { VazioLista } from "@/components/EstadoVazio";
import { FlaskConical } from "lucide-react";
import Link from "next/link";
import { Erro } from "@/components/Erro";
import { dataBR } from "@/lib/datas";
import { situacaoExposicao } from "@/lib/higiene";
import { requireOrg } from "@/lib/org";
import { opcoesSetor } from "@/lib/setores";
import { createClient } from "@/lib/supabase/server";
import { criarGhe } from "./actions";

type Props = { searchParams: Promise<{ erro?: string }> };

type Ghe = {
  id: string;
  name: string;
  workers_count: number | null;
  active: boolean;
  sectors: { name: string } | null;
  exposure_assessments: {
    agent: string;
    measured_on: string;
    result: number;
    unit: string;
    limit_value: number | null;
    action_level: number | null;
  }[];
};

export default async function HigienePage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data }, setores] = await Promise.all([
    supabase
      .from("exposure_groups")
      .select("id, name, workers_count, active, sectors(name), exposure_assessments(agent, measured_on, result, unit, limit_value, action_level)")
      .eq("organization_id", org.id)
      .order("name"),
    opcoesSetor(org.id),
  ]);
  const ghes = (data ?? []) as unknown as Ghe[];

  return (
    <div>
      <h1 className="titulo">Higiene ocupacional</h1>
      <p className="mt-1 text-sm text-slate-600">
        Organize os trabalhadores em GHE (grupos com exposição parecida) e registre as medições: ruído, calor, poeira,
        químicos. O sistema compara com o limite de tolerância e o nível de ação, e o que passar vira ação no plano do
        PGR.
      </p>
      <Erro mensagem={erro} />

      <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
        {ghes.map((g) => {
          // Última medição de cada agente
          const ultimas = new Map<string, Ghe["exposure_assessments"][number]>();
          for (const a of [...g.exposure_assessments].sort((x, y) => y.measured_on.localeCompare(x.measured_on))) {
            if (!ultimas.has(a.agent)) ultimas.set(a.agent, a);
          }
          return (
            <li key={g.id} className="px-4 py-3">
              <Link href={`/app/higiene/${g.id}`} className="font-medium text-emerald-800 underline">{g.name}</Link>
              <span className="text-slate-500">
                {g.sectors ? ` · ${g.sectors.name}` : ""}
                {g.workers_count ? ` · ${g.workers_count} pessoa(s)` : ""}
                {g.active ? "" : " · inativo"}
              </span>
              <div className="mt-1 flex flex-wrap gap-2">
                {[...ultimas.values()].map((a) => {
                  const s = situacaoExposicao(Number(a.result), a.limit_value, a.action_level);
                  return (
                    <span key={a.agent} className={`rounded px-2 py-0.5 text-xs ${s.cor}`} title={`medido em ${dataBR(a.measured_on)}`}>
                      {a.agent}: {a.result} {a.unit}
                    </span>
                  );
                })}
                {!ultimas.size && <span className="text-xs text-slate-500">sem medições</span>}
              </div>
            </li>
          );
        })}
        {!ghes.length && (
          <VazioLista
            icone={FlaskConical}
            titulo="Nenhum GHE ainda"
            texto="Crie os grupos homogêneos de exposição e lance as medições de ruído, calor, poeira e químicos."
          />
        )}
      </ul>

      <details className="mt-6" open={!ghes.length}>
        <summary className="cursor-pointer text-sm font-medium text-emerald-800">+ Novo GHE</summary>
        <form action={criarGhe} className="mt-2 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-2">
          <label>
            Nome do GHE
            <input name="nome" required className="input mt-1" placeholder="Ex.: Operadores de prensa" />
          </label>
          <label>
            Setor
            <select name="setor" className="input mt-1" defaultValue="">
              <option value="">—</option>
              {setores.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            Atividades
            <textarea name="atividades" rows={2} className="input mt-1" />
          </label>
          <label>
            Número de trabalhadores
            <input name="pessoas" type="number" min={0} className="input mt-1" />
          </label>
          <div className="sm:col-span-2">
            <button className="btn">Criar GHE</button>
          </div>
        </form>
      </details>
    </div>
  );
}
