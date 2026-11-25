import Link from "next/link";
import { notFound } from "next/navigation";
import {
  adicionarEtapa,
  enviarApr,
  encerrarApr,
  excluirApr,
  removerEtapa,
  revisarApr,
} from "@/app/app/apr/actions";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { Erro } from "@/components/Erro";
import { MatrizRisco } from "@/components/MatrizRisco";
import { dataBR } from "@/lib/datas";
import { dataHora, numeroApr, numeroPt, podeAprovar, STATUS_APR, STATUS_PT, TIPOS_PT } from "@/lib/apr";
import { requireOrg } from "@/lib/org";
import { NivelBadge, PROBABILIDADE, SEVERIDADE } from "@/lib/risco";
import { createClient } from "@/lib/supabase/server";
import { Participantes, type Assinante } from "./Participantes";

type Apr = {
  id: string;
  number: number;
  title: string;
  location: string | null;
  planned_on: string;
  description: string | null;
  status: string;
  created_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  sectors: { name: string } | null;
};
type Etapa = {
  id: string;
  step: string;
  hazard: string;
  harm: string | null;
  severity: number;
  probability: number;
  level: number;
  controls: string;
};

/** Tela da APR, igual na Gestão (base "/app") e no Meu EHS (base "/meu"). */
export async function AprDetalhe({ id, base, erro }: { id: string; base: "/app" | "/meu"; erro?: string }) {
  const org = await requireOrg();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data }, { data: etapas }, { data: assinaturas }, { data: pessoas }, { data: pts }] = await Promise.all([
    supabase
      .from("aprs")
      .select("id, number, title, location, planned_on, description, status, created_by, reviewed_at, review_notes, sectors(name)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("apr_steps").select("*").eq("apr_id", id).order("position"),
    supabase.from("task_signatures").select("id, worker_id, role, signed_at").eq("apr_id", id).order("created_at"),
    supabase.rpc("worker_directory", { p_org: org.id }),
    supabase.from("work_permits").select("id, number, kind, status").eq("apr_id", id),
  ]);
  if (!data) notFound();
  const apr = data as unknown as Apr;
  const lista = (etapas ?? []) as Etapa[];
  const voltar = `${base}/apr/${id}`;
  const equipe = podeAprovar(org.role);
  const autor = apr.created_by === user?.id;
  const editavel = (equipe && apr.status !== "encerrada") || (autor && ["rascunho", "reprovada"].includes(apr.status));
  const hidden = (
    <>
      <input type="hidden" name="id" value={apr.id} />
      <input type="hidden" name="voltar" value={voltar} />
    </>
  );

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href={`${base}/apr`} className="text-sm text-emerald-700 underline">← APRs</Link>
        <BotaoImprimir />
      </div>
      <h1 className="mt-3 text-xl font-bold">
        {numeroApr(apr.number)} · {apr.title}
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        {STATUS_APR[apr.status]} · {dataBR(apr.planned_on)}
        {apr.sectors ? ` · ${apr.sectors.name}` : ""}
        {apr.location ? ` · ${apr.location}` : ""}
      </p>
      {apr.description && <p className="mt-2 text-sm">{apr.description}</p>}
      <Erro mensagem={erro} />
      {apr.review_notes && (
        <p className={`mt-3 rounded-md px-3 py-2 text-sm ${apr.status === "reprovada" ? "bg-amber-50 text-amber-900" : "bg-slate-50"}`}>
          Revisão em {dataHora(apr.reviewed_at)}: {apr.review_notes}
        </p>
      )}

      <section className="mt-6">
        <h2 className="font-semibold">Etapas, perigos e controles</h2>
        <ol className="mt-2 space-y-2">
          {lista.map((e, i) => (
            <li key={e.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">
                  {i + 1}. {e.step}
                </p>
                <NivelBadge nivel={e.level} />
              </div>
              <p className="mt-1"><span className="text-slate-500">Perigo:</span> {e.hazard}</p>
              {e.harm && <p><span className="text-slate-500">Pode causar:</span> {e.harm}</p>}
              <p className="text-xs text-slate-500">
                Severidade {SEVERIDADE[e.severity]} · Probabilidade {PROBABILIDADE[e.probability]}
              </p>
              <p className="mt-1"><span className="text-slate-500">Controles:</span> {e.controls}</p>
              {editavel && (
                <form action={removerEtapa} className="mt-1 print:hidden">
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="voltar" value={voltar} />
                  <button className="text-xs text-red-600 hover:underline">Remover etapa</button>
                </form>
              )}
            </li>
          ))}
          {!lista.length && <li className="text-sm text-slate-500">Nenhuma etapa ainda.</li>}
        </ol>

        {editavel && (
          <details className="mt-3 rounded-lg border border-slate-200 bg-white p-3 print:hidden" open={!lista.length}>
            <summary className="cursor-pointer text-sm font-medium text-emerald-800">+ Adicionar etapa</summary>
            <form action={adicionarEtapa} className="mt-3 grid gap-3 text-sm">
              <input type="hidden" name="apr" value={apr.id} />
              <input type="hidden" name="voltar" value={voltar} />
              <label>
                Etapa da tarefa
                <input name="etapa" required className="input mt-1" placeholder="Ex.: subir na escada" />
              </label>
              <label>
                Perigo
                <input name="perigo" required className="input mt-1" placeholder="Ex.: queda de altura" />
              </label>
              <label>
                O que pode causar (opcional)
                <input name="dano" className="input mt-1" placeholder="Ex.: fratura" />
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
              <details className="text-xs text-slate-600">
                <summary className="cursor-pointer">Ver a matriz de risco</summary>
                <div className="mt-2">
                  <MatrizRisco />
                </div>
              </details>
              <label>
                Medidas de controle
                <textarea name="controles" required rows={2} className="input mt-1" placeholder="Ex.: escada travada, cinto preso, ajudante segurando" />
              </label>
              <div>
                <button className="btn">Adicionar</button>
              </div>
            </form>
          </details>
        )}
      </section>

      <Participantes
        alvo={{ apr: apr.id }}
        assinaturas={(assinaturas ?? []) as Assinante[]}
        pessoas={pessoas ?? []}
        meuWorkerId={org.workerId}
        podeEditar={editavel}
        podeAssinar={apr.status !== "encerrada"}
        voltar={voltar}
        papeis={["executante", "responsavel"]}
      />

      {!!pts?.length && (
        <section className="mt-6 text-sm">
          <h2 className="font-semibold">Permissões de trabalho desta APR</h2>
          <ul className="mt-1 list-disc pl-5">
            {pts.map((p) => (
              <li key={p.id}>
                <Link href={`${base}/pt/${p.id}`} className="underline">
                  {numeroPt(p.number)} · {TIPOS_PT[p.kind]?.nome}
                </Link>{" "}
                · {STATUS_PT[p.status]}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 flex flex-wrap gap-3 print:hidden">
        {autor && ["rascunho", "reprovada"].includes(apr.status) && (
          <form action={enviarApr}>
            {hidden}
            <button className="btn">Enviar para aprovação</button>
          </form>
        )}
        {equipe && apr.status === "aprovada" && (
          <form action={encerrarApr}>
            {hidden}
            <button className="btn-ghost">Encerrar APR (tarefa concluída)</button>
          </form>
        )}
        {(autor || equipe) && ["rascunho", "reprovada"].includes(apr.status) && (
          <form action={excluirApr}>
            {hidden}
            <button className="text-sm text-red-600 hover:underline">Excluir APR</button>
          </form>
        )}
      </section>

      {equipe && apr.status === "aguardando_aprovacao" && (
        <form action={revisarApr} className="mt-6 grid gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm print:hidden">
          {hidden}
          <p className="font-medium">Revisão da equipe de segurança</p>
          <textarea name="notas" rows={2} className="input" placeholder="Observações (obrigatório para devolver)" />
          <div className="flex gap-2">
            <button name="decisao" value="aprovar" className="btn">Aprovar</button>
            <button name="decisao" value="devolver" className="btn-ghost">Devolver para ajuste</button>
          </div>
        </form>
      )}
    </div>
  );
}
