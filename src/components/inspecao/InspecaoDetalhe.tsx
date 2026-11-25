import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { Erro } from "@/components/Erro";
import { dataBR } from "@/lib/datas";
import { RESPOSTAS } from "@/lib/inspecao";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { excluirInspecao, reabrirInspecao, salvarRespostas } from "@/app/app/inspecoes/actions";
import { podeAprovar } from "@/lib/apr";


type Inspecao = {
  id: string;
  number: number;
  location: string | null;
  created_by: string | null;
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
  photo_path: string | null;
  photo_name: string | null;
  action_id: string | null;
  actions: { number: number; status: string; plan_id: string } | null;
};

/** Tela da inspeção, igual na Gestão (base "/app") e no Meu EHS (base "/meu"). */
export async function InspecaoDetalhe({ id, base, erro, ok }: { id: string; base: "/app" | "/meu"; erro?: string; ok?: string }) {
  const org = await requireOrg();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: insp }, { data: resp }] = await Promise.all([
    supabase
      .from("inspections")
      .select("id, number, location, created_by, inspected_on, inspector, status, notes, checklist_templates(name), sectors(name)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("inspection_answers")
      .select("id, position, question, answer, comment, photo_path, photo_name, action_id, actions(number, status, plan_id)")
      .eq("inspection_id", id)
      .order("position"),
  ]);
  if (!insp) notFound();
  const i = insp as unknown as Inspecao;
  const respostas = (resp ?? []) as unknown as Resposta[];
  const concluida = i.status === "concluida";
  const equipe = podeAprovar(org.role);
  const editavel = !concluida && (equipe || i.created_by === user?.id);
  const voltar = `${base}/inspecoes/${i.id}`;
  const caminhos = respostas.map((r) => r.photo_path).filter(Boolean) as string[];
  const fotos = new Map<string, string>();
  if (caminhos.length) {
    const { data: assinadas } = await supabase.storage.from("evidencias").createSignedUrls(caminhos, 3600);
    for (const f of assinadas ?? []) if (f.path && f.signedUrl) fotos.set(f.path, f.signedUrl);
  }
  const nAcoes = Number(ok?.split("-")[1] ?? 0);
  const contagem = (r: string) => respostas.filter((x) => x.answer === r).length;
  const aplicaveis = respostas.length - contagem("na");
  const indice = aplicaveis ? Math.round((contagem("conforme") / aplicaveis) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href={`${base}/inspecoes`} className="text-sm text-emerald-700 underline">← Inspeções</Link>
        <BotaoImprimir />
      </div>
      <h1 className="mt-3 text-xl font-bold">
        I-{String(i.number).padStart(4, "0")} · {i.checklist_templates?.name}
      </h1>
      <p className="text-sm text-slate-600">
        {org.name} · {dataBR(i.inspected_on)}
        {i.sectors ? ` · ${i.sectors.name}` : ""}
        {i.location ? ` · ${i.location}` : ""}
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
          {ok?.startsWith("concluida")
            ? nAcoes
              ? `Inspeção concluída. ${nAcoes} não conformidade(s) viraram ações no plano de ação.`
              : "Inspeção concluída, sem não conformidades."
            : "Respostas salvas."}
        </p>
      )}

      <form action={salvarRespostas} className="mt-4">
        <input type="hidden" name="id" value={i.id} />
        <input type="hidden" name="voltar" value={voltar} />
        <ol className="space-y-3">
          {respostas.map((r, n) => (
            <li key={r.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <p className="font-medium">{n + 1}. {r.question}</p>
              {!editavel ? (
                <p className="mt-1">
                  <span className={RESPOSTAS[r.answer ?? ""]?.classe}>{RESPOSTAS[r.answer ?? ""]?.texto ?? "—"}</span>
                  {r.comment ? ` · ${r.comment}` : ""}
                  {r.actions &&
                    (base === "/app" ? (
                      <Link href={`/app/acoes/plano/${r.actions.plan_id}`} className="ml-2 text-emerald-700 underline">
                        Ação #{String(r.actions.number).padStart(4, "0")}
                      </Link>
                    ) : (
                      <span className="ml-2 text-emerald-700">virou a ação #{String(r.actions.number).padStart(4, "0")}</span>
                    ))}
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
                  <label className="mt-2 block text-xs text-slate-600 print:hidden">
                    {r.photo_path ? "Trocar a foto" : "Foto (opcional)"}
                    <input name={`f_${r.id}`} type="file" accept="image/*" capture="environment" className="mt-1 block w-full text-xs" />
                  </label>
                </>
              )}
              {r.photo_path && fotos.get(r.photo_path) && (
                <a href={fotos.get(r.photo_path)} target="_blank" rel="noreferrer" className="mt-2 block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fotos.get(r.photo_path)} alt={r.photo_name ?? "foto"} className="h-28 rounded border border-slate-200 object-cover" />
                </a>
              )}
            </li>
          ))}
        </ol>
        <label className="mt-4 block text-sm">
          Observações gerais
          {!editavel ? (
            <p className="mt-1">{i.notes ?? "—"}</p>
          ) : (
            <textarea name="obs" defaultValue={i.notes ?? ""} rows={2} className="input mt-1" />
          )}
        </label>
        {editavel && (
          <div className="mt-4 flex flex-wrap gap-3 print:hidden">
            <button className="btn-ghost" name="concluir" value="0">Salvar e continuar depois</button>
            <button className="btn" name="concluir" value="1">Concluir e gerar ações</button>
          </div>
        )}
      </form>

      <div className="mt-8 flex gap-6 print:hidden">
        {concluida && equipe && (
          <form action={reabrirInspecao}>
            <input type="hidden" name="id" value={i.id} />
            <input type="hidden" name="voltar" value={voltar} />
            <button className="text-xs text-slate-600 hover:underline">Reabrir para corrigir</button>
          </form>
        )}
        {editavel && (
          <form action={excluirInspecao}>
            <input type="hidden" name="id" value={i.id} />
            <input type="hidden" name="voltar" value={voltar} />
            <button className="text-xs text-red-600 hover:underline">Excluir inspeção</button>
          </form>
        )}
      </div>
    </div>
  );
}
