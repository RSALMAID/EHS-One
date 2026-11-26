import Link from "next/link";
import { Erro } from "@/components/Erro";
import { NovaInspecao } from "@/components/inspecao/NovaInspecao";
import { dataBR } from "@/lib/datas";
import { requireOrg } from "@/lib/org";
import { opcoesSetor } from "@/lib/setores";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ erro?: string }> };

/** Meu EHS: inspeções que eu fiz (o banco só devolve essas para o trabalhador). */
export default async function MinhasInspecoesPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: modelos }, setores, { data: lista }, { data: eu }] = await Promise.all([
    supabase.from("checklist_templates").select("id, name").eq("organization_id", org.id).eq("active", true).order("name"),
    opcoesSetor(org.id),
    supabase
      .from("inspections")
      .select("id, number, inspected_on, status, checklist_templates(name), inspection_answers(answer)")
      .eq("organization_id", org.id)
      .eq("created_by", user!.id)
      .order("inspected_on", { ascending: false })
      .limit(30),
    supabase.from("workers").select("full_name").eq("id", org.workerId ?? "").maybeSingle(),
  ]);
  const inspecoes = (lista ?? []) as unknown as {
    id: string;
    number: number;
    inspected_on: string;
    status: string;
    checklist_templates: { name: string } | null;
    inspection_answers: { answer: string | null }[];
  }[];

  return (
    <div>
      <h1 className="text-xl font-bold">Inspeções</h1>
      <p className="mt-1 text-sm text-slate-600">
        Escolha o checklist, responda no local e tire foto do que estiver errado. Cada “não conforme” vira uma ação
        para a equipe de segurança.
      </p>
      <Erro mensagem={erro} />
      {modelos?.length ? (
        <details className="mt-4" open={!inspecoes.length}>
          <summary className="btn w-full">+ Nova inspeção</summary>
          <div className="mt-2">
            <NovaInspecao modelos={modelos} setores={setores} voltar="/meu/inspecoes" inspetor={eu?.full_name} />
          </div>
        </details>
      ) : (
        <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
          A empresa ainda não cadastrou checklists. Peça à equipe de segurança.
        </p>
      )}

      <h2 className="mt-6 font-semibold">Minhas inspeções</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
        {inspecoes.map((i) => {
          const nc = i.inspection_answers.filter((a) => a.answer === "nao_conforme").length;
          const feitas = i.inspection_answers.filter((a) => a.answer).length;
          return (
            <li key={i.id}>
              <Link href={`/meu/inspecoes/${i.id}`} className="block px-4 py-3 active:bg-slate-50">
                <span className="font-medium">
                  {dataBR(i.inspected_on)} · {i.checklist_templates?.name}
                </span>
                <span className="block text-slate-500">
                  {i.status === "concluida" ? "Concluída" : `Em andamento (${feitas}/${i.inspection_answers.length})`}
                  {nc ? ` · ${nc} não conforme(s)` : ""}
                </span>
              </Link>
            </li>
          );
        })}
        {!inspecoes.length && <li className="px-4 py-4 text-center text-slate-500">Nenhuma inspeção ainda.</li>}
      </ul>
    </div>
  );
}
