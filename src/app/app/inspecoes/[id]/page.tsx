import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { Erro } from "@/components/Erro";
import { dataBR } from "@/lib/datas";
import { RESPOSTAS } from "@/lib/inspecao";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { excluirInspecao, reabrirInspecao, salvarRespostas } from "../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ok?: string }> };

type Inspecao = {
  id: string;
  inspected_on: string;
  inspector: string | null;
  status: string;
  notes: string | null;
  checklist_templates: { name: string } | null;
  sectors: { name: string } | null;
};
type Resposta = {
  id: string;
  position: number;
  question: string;
  answer: string | null;
  comment: string | null;
  action_id: string | null;
  actions: { number: number; status: string } | null;
};

export default async function InspecaoPage({ params, searchParams }: Props) {
  const [{ id }, { erro, ok }] = await Promise.all([params, searchParams]);
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: insp }, { data: resp }] = await Promise.all([
    supabase
      .from("inspections")
      .select("id, inspected_on, inspector, status, notes, checklist_templates(name), sectors(name)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("inspection_answers")
      .select("id, position, question, answer, comment, action_id, actions(number, status)")
      .eq("inspection_id", id)
      .order("position"),
  ]);
  if (!insp) notFound();
  const i = insp as unknown as Inspecao;
  const respostas = (resp ?? []) as unknown as Resposta[];
  const concluida = i.status === "concluida";
  const contagem = (r: string) => respostas.filter((x) => x.answer === r).length;
  const aplicaveis = respostas.length - contagem("na");
  const indice = aplicaveis ? Math.round((contagem("conforme") / aplicaveis) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href="/app/inspecoes" className="text-sm text-emerald-700 underline">← Inspeções</Link>
        <BotaoImprimir />
      </div>
      <h1 className="mt-3 text-2xl font-bold">{i.checklist_templates?.name}</h1>
      <p className="text-sm text-slate-600">
        {org.name} · {dataBR(i.inspected_on)}
        {i.sectors ? ` · ${i.sectors.name}` : ""}
        {i.inspector ? ` · inspetor: ${i.inspector}` : ""} ·{" "}
        {concluida ? "concluída" : "em andamento"}
      </p>
      {concluida && (
        <p className="mt-1 text-sm">
          Conformidade: <strong>{indice}%</strong> ({contagem("conforme")} conformes, {contagem("nao_conforme")} não
          conformes, {contagem("na")} não se aplicam)
        </p>
      )}
      <Erro mensagem={erro} />
      {ok && (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 print:hidden">
          {ok === "concluida" ? "Inspeção concluída. As não conformidades viraram ações na Central de Ações." : "Respostas salvas."}
        </p>
      )}

      <form action={salvarRespostas} className="mt-4">
        <input type="hidden" name="id" value={i.id} />
        <ol className="space-y-3">
          {respostas.map((r, n) => (
            <li key={r.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <p className="font-medium">{n + 1}. {r.question}</p>
              {concluida ? (
                <p className="mt-1">
                  <span className={RESPOSTAS[r.answer ?? ""]?.classe}>{RESPOSTAS[r.answer ?? ""]?.texto ?? "—"}</span>
                  {r.comment ? ` · ${r.comment}` : ""}
                  {r.actions && (
                    <Link href="/app/acoes" className="ml-2 text-emerald-700 underline">
                      Ação #{String(r.actions.number).padStart(4, "0")}
                    </Link>
                  )}
                </p>
              ) : (
                <>
                  <div className="mt-2 flex flex-wrap gap-4">
                    {Object.entries(RESPOSTAS).map(([v, l]) => (
                      <label key={v} className="flex items-center gap-1">
                        <input type="radio" name={`r_${r.id}`} value={v} defaultChecked={r.answer === v} /> {l.texto}
                      </label>
                    ))}
                  </div>
                  <input
                    name={`c_${r.id}`}
                    defaultValue={r.comment ?? ""}
                    className="input mt-2"
                    placeholder="Comentário (o que foi visto, onde)"
                  />
                </>
              )}
            </li>
          ))}
        </ol>
        <label className="mt-4 block text-sm">
          Observações gerais
          {concluida ? (
            <p className="mt-1">{i.notes ?? "—"}</p>
          ) : (
            <textarea name="obs" defaultValue={i.notes ?? ""} rows={2} className="input mt-1" />
          )}
        </label>
        {!concluida && (
          <div className="mt-4 flex flex-wrap gap-3 print:hidden">
            <button className="btn-ghost" name="concluir" value="0">Salvar e continuar depois</button>
            <button className="btn" name="concluir" value="1">Concluir e gerar ações</button>
          </div>
        )}
      </form>

      <div className="mt-8 flex gap-6 print:hidden">
        {concluida && (
          <form action={reabrirInspecao}>
            <input type="hidden" name="id" value={i.id} />
            <button className="text-xs text-slate-600 hover:underline">Reabrir para corrigir</button>
          </form>
        )}
        <form action={excluirInspecao}>
          <input type="hidden" name="id" value={i.id} />
          <button className="text-xs text-red-600 hover:underline">Excluir inspeção</button>
        </form>
      </div>
    </div>
  );
}
