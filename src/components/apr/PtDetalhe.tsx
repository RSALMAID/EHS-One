import Link from "next/link";
import { notFound } from "next/navigation";
import { encerrarPt, liberarPt, responderChecklist } from "@/app/app/apr/actions";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { Erro } from "@/components/Erro";
import { dataHora, numeroApr, numeroPt, podeAprovar, STATUS_PT, TIPOS_PT } from "@/lib/apr";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { Participantes, type Assinante } from "./Participantes";

type Pt = {
  id: string;
  number: number;
  kind: string;
  location: string | null;
  description: string;
  valid_from: string;
  valid_until: string;
  status: string;
  requested_by: string | null;
  issued_at: string | null;
  closed_at: string | null;
  closing_notes: string | null;
  sectors: { name: string } | null;
  aprs: { id: string; number: number; title: string } | null;
};

const RESPOSTAS = [
  ["sim", "Sim"],
  ["nao", "Não"],
  ["na", "N/A"],
];

/** Tela da PT, igual na Gestão (base "/app") e no Meu EHS (base "/meu"). */
export async function PtDetalhe({ id, base, erro }: { id: string; base: "/app" | "/meu"; erro?: string }) {
  const org = await requireOrg();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data }, { data: checks }, { data: assinaturas }, { data: pessoas }] = await Promise.all([
    supabase
      .from("work_permits")
      .select(
        "id, number, kind, location, description, valid_from, valid_until, status, requested_by, issued_at, closed_at, closing_notes, sectors(name), aprs(id, number, title)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("permit_checks").select("id, question, answer").eq("permit_id", id).order("position"),
    supabase.from("task_signatures").select("id, worker_id, role, signed_at").eq("permit_id", id).order("created_at"),
    supabase.rpc("worker_directory", { p_org: org.id }),
  ]);
  if (!data) notFound();
  const pt = data as unknown as Pt;
  const tipo = TIPOS_PT[pt.kind];
  const voltar = `${base}/pt/${id}`;
  const equipe = podeAprovar(org.role);
  const editavel = pt.status === "solicitada" && (equipe || pt.requested_by === user?.id);
  const vencida = pt.status === "liberada" && new Date(pt.valid_until) < new Date();
  const hidden = (
    <>
      <input type="hidden" name="id" value={pt.id} />
      <input type="hidden" name="voltar" value={voltar} />
    </>
  );

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href={`${base}/${base === "/meu" ? "apr" : "pt"}`} className="text-sm text-emerald-700 underline">
          ← Permissões
        </Link>
        <BotaoImprimir />
      </div>
      <h1 className="mt-3 text-xl font-bold">
        {numeroPt(pt.number)} · {tipo?.nome}
        {tipo?.nr ? <span className="ml-2 text-sm font-normal text-slate-500">{tipo.nr}</span> : null}
      </h1>
      <p className={`mt-2 inline-block rounded px-2 py-0.5 text-sm font-medium ${
        pt.status === "liberada" && !vencida ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"
      }`}>
        {vencida ? "Liberada, mas o prazo venceu" : STATUS_PT[pt.status]}
      </p>
      <p className="mt-2 text-sm">{pt.description}</p>
      <p className="mt-1 text-sm text-slate-600">
        Válida de {dataHora(pt.valid_from)} até {dataHora(pt.valid_until)}
        {pt.sectors ? ` · ${pt.sectors.name}` : ""}
        {pt.location ? ` · ${pt.location}` : ""}
      </p>
      {pt.aprs && (
        <p className="mt-1 text-sm">
          APR:{" "}
          <Link href={`${base}/apr/${pt.aprs.id}`} className="underline">
            {numeroApr(pt.aprs.number)} · {pt.aprs.title}
          </Link>
        </p>
      )}
      {pt.issued_at && <p className="mt-1 text-sm text-slate-600">Liberada em {dataHora(pt.issued_at)}</p>}
      {pt.closed_at && (
        <p className="mt-1 text-sm text-slate-600">
          {STATUS_PT[pt.status]} em {dataHora(pt.closed_at)}
          {pt.closing_notes ? `: ${pt.closing_notes}` : ""}
        </p>
      )}
      <Erro mensagem={erro} />

      <section className="mt-6">
        <h2 className="font-semibold">Checklist de liberação</h2>
        <form action={responderChecklist} className="mt-2">
          <input type="hidden" name="voltar" value={voltar} />
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
            {(checks ?? []).map((c) => (
              <li key={c.id} className="px-4 py-2">
                <p>{c.question}</p>
                {editavel ? (
                  <div className="mt-1 flex gap-4">
                    {RESPOSTAS.map(([v, l]) => (
                      <label key={v} className="flex items-center gap-1">
                        <input type="radio" name={`r_${c.id}`} value={v} defaultChecked={c.answer === v} /> {l}
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className={`text-xs ${c.answer === "nao" ? "text-red-700" : "text-slate-500"}`}>
                    {RESPOSTAS.find(([v]) => v === c.answer)?.[1] ?? "sem resposta"}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {editavel && <button className="btn-ghost mt-2 print:hidden">Salvar respostas</button>}
        </form>
      </section>

      <Participantes
        alvo={{ pt: pt.id }}
        assinaturas={(assinaturas ?? []) as Assinante[]}
        pessoas={pessoas ?? []}
        meuWorkerId={org.workerId}
        podeEditar={editavel}
        podeAssinar={["solicitada", "liberada"].includes(pt.status)}
        voltar={voltar}
        papeis={["executante", "responsavel", "vigia", "emitente"]}
      />

      {equipe && (
        <section className="mt-6 flex flex-wrap items-start gap-3 print:hidden">
          {pt.status === "solicitada" && (
            <form action={liberarPt}>
              {hidden}
              <button className="btn">Liberar PT</button>
            </form>
          )}
          {["solicitada", "liberada"].includes(pt.status) && (
            <form action={encerrarPt} className="flex flex-wrap gap-2">
              {hidden}
              <input name="notas" className="input w-64" placeholder="Observações do encerramento" />
              <button className="btn-ghost">{pt.status === "liberada" ? "Encerrar (serviço concluído)" : "Encerrar"}</button>
              <button name="cancelar" value="1" className="text-sm text-red-600 hover:underline">Cancelar PT</button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
