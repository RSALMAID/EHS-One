import Link from "next/link";
import { Erro } from "@/components/Erro";
import { dataBR, hoje } from "@/lib/datas";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { iniciarInspecao } from "./actions";

type Props = { searchParams: Promise<{ erro?: string }> };

type Linha = {
  id: string;
  inspected_on: string;
  inspector: string | null;
  status: string;
  checklist_templates: { name: string } | null;
  sectors: { name: string } | null;
  inspection_answers: { answer: string | null }[];
};

export default async function InspecoesPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: modelos }, { data: setores }, { data: unidades }, { data: lista }] = await Promise.all([
    supabase.from("checklist_templates").select("id, name").eq("organization_id", org.id).eq("active", true).order("name"),
    supabase.from("sectors").select("id, name, unit_id").eq("organization_id", org.id).order("name"),
    supabase.from("units").select("id, name").eq("organization_id", org.id),
    supabase
      .from("inspections")
      .select("id, inspected_on, inspector, status, checklist_templates(name), sectors(name), inspection_answers(answer)")
      .eq("organization_id", org.id)
      .order("inspected_on", { ascending: false })
      .limit(50),
  ]);
  const inspecoes = (lista ?? []) as unknown as Linha[];
  const unidade = (id: string) => unidades?.find((u) => u.id === id)?.name ?? "";

  return (
    <div>
      <h1 className="text-2xl font-bold">Inspeções e checklists</h1>
      <p className="mt-1 text-sm text-slate-600">
        Escolha um modelo, responda no local (dá para usar no celular) e conclua. Cada “não conforme” vira uma ação
        na Central de Ações.
      </p>
      <div className="mt-3">
        <Link href="/app/inspecoes/modelos" className="btn-ghost">Modelos de checklist</Link>
      </div>
      <Erro mensagem={erro} />

      <form action={iniciarInspecao} className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-4 sm:items-end">
        <label className="text-sm">
          Modelo
          <select name="modelo" required className="input mt-1">
            <option value="">— escolha —</option>
            {(modelos ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Setor (opcional)
          <select name="setor" className="input mt-1">
            <option value="">—</option>
            {(setores ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({unidade(s.unit_id)})</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Data
          <input name="data" type="date" defaultValue={hoje()} className="input mt-1" />
        </label>
        <label className="text-sm">
          Inspetor
          <input name="inspetor" className="input mt-1" />
        </label>
        <div className="sm:col-span-4">
          <button className="btn">Iniciar inspeção</button>
          {!modelos?.length && (
            <span className="ml-3 text-sm text-slate-500">
              Nenhum modelo ainda: crie em <Link href="/app/inspecoes/modelos" className="underline">Modelos de checklist</Link>.
            </span>
          )}
        </div>
      </form>

      <ul className="mt-6 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {inspecoes.map((i) => {
          const nc = i.inspection_answers.filter((a) => a.answer === "nao_conforme").length;
          const respondidas = i.inspection_answers.filter((a) => a.answer).length;
          return (
            <li key={i.id} className="px-4 py-2">
              <Link href={`/app/inspecoes/${i.id}`} className="font-medium underline">
                {dataBR(i.inspected_on)} · {i.checklist_templates?.name}
              </Link>
              {i.sectors ? ` · ${i.sectors.name}` : ""}
              {i.inspector ? ` · ${i.inspector}` : ""} ·{" "}
              {i.status === "concluida" ? (
                <span className="text-emerald-700">concluída</span>
              ) : (
                <span className="text-amber-700">em andamento ({respondidas}/{i.inspection_answers.length})</span>
              )}
              {nc > 0 && <span className="text-red-700"> · {nc} não conforme(s)</span>}
            </li>
          );
        })}
        {!inspecoes.length && <li className="px-4 py-6 text-center text-slate-500">Nenhuma inspeção ainda.</li>}
      </ul>
    </div>
  );
}
