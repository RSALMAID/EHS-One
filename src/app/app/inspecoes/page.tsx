import Link from "next/link";
import { Erro } from "@/components/Erro";
import { NovaInspecao } from "@/components/inspecao/NovaInspecao";
import { dataBR } from "@/lib/datas";
import { requireOrg } from "@/lib/org";
import { opcoesSetor } from "@/lib/setores";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ erro?: string }> };

type Linha = {
  id: string;
  number: number;
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
  const [{ data: modelos }, setores, { data: lista }] = await Promise.all([
    supabase.from("checklist_templates").select("id, name").eq("organization_id", org.id).eq("active", true).order("name"),
    opcoesSetor(org.id),
    supabase
      .from("inspections")
      .select("id, number, inspected_on, inspector, status, checklist_templates(name), sectors(name), inspection_answers(answer)")
      .eq("organization_id", org.id)
      .order("inspected_on", { ascending: false })
      .limit(50),
  ]);
  const inspecoes = (lista ?? []) as unknown as Linha[];

  return (
    <div>
      <h1 className="titulo">Inspeções e checklists</h1>
      <p className="mt-1 text-sm text-slate-600">
        Escolha um modelo, responda no local e conclua. Os trabalhadores também inspecionam pelo Meu EHS, com foto.
        Cada “não conforme” vira uma ação num plano de ação da inspeção.
      </p>
      <div className="mt-3">
        <Link href="/app/inspecoes/modelos" className="btn-ghost">Modelos de checklist</Link>
      </div>
      <Erro mensagem={erro} />

      <div id="novo" className="mt-6 scroll-mt-20">
        <NovaInspecao modelos={modelos ?? []} setores={setores} voltar="/app/inspecoes" />
        {!modelos?.length && (
          <p className="mt-2 text-sm text-slate-500">
            Nenhum modelo ainda: crie em <Link href="/app/inspecoes/modelos" className="underline">Modelos de checklist</Link>.
          </p>
        )}
      </div>

      <ul className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
        {inspecoes.map((i) => {
          const nc = i.inspection_answers.filter((a) => a.answer === "nao_conforme").length;
          const respondidas = i.inspection_answers.filter((a) => a.answer).length;
          return (
            <li key={i.id} className="px-4 py-2">
              <Link href={`/app/inspecoes/${i.id}`} className="font-medium underline">
                I-{String(i.number).padStart(4, "0")} · {dataBR(i.inspected_on)} · {i.checklist_templates?.name}
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
