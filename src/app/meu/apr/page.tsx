import Link from "next/link";
import { NovaApr, NovaPt } from "@/components/apr/Formularios";
import { Erro } from "@/components/Erro";
import { numeroApr, numeroPt, STATUS_APR, STATUS_PT, TIPOS_PT } from "@/lib/apr";
import { requireOrg } from "@/lib/org";
import { opcoesSetor } from "@/lib/setores";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ erro?: string }> };

/** Meu EHS: APRs e PTs que criei ou em que fui incluído (o banco só devolve essas). */
export default async function MinhasTarefasPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: aprs }, { data: pts }, { data: pendentes }, setores] = await Promise.all([
    supabase.from("aprs").select("id, number, title, status").eq("organization_id", org.id).neq("status", "encerrada").order("number", { ascending: false }).limit(30),
    supabase.from("work_permits").select("id, number, kind, status").eq("organization_id", org.id).in("status", ["solicitada", "liberada"]).order("number", { ascending: false }).limit(30),
    supabase.from("task_signatures").select("id").eq("worker_id", org.workerId ?? "").is("signed_at", null),
    opcoesSetor(org.id),
  ]);
  const aprovadas = (aprs ?? []).filter((a) => a.status === "aprovada");

  return (
    <div>
      <h1 className="text-xl font-bold">APR e PT</h1>
      <p className="mt-1 text-sm text-slate-600">
        Antes de uma tarefa de risco, faça a APR com a equipe. Para altura, espaço confinado, solda e eletricidade,
        peça também a PT.
      </p>
      <Erro mensagem={erro} />
      {!!pendentes?.length && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Você tem {pendentes.length} assinatura(s) pendente(s). Abra a APR ou PT abaixo e toque em “Li e assino”.
        </p>
      )}

      <h2 className="mt-5 font-semibold">Minhas APRs</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
        {(aprs ?? []).map((a) => (
          <li key={a.id}>
            <Link href={`/meu/apr/${a.id}`} className="block px-4 py-3 active:bg-slate-50">
              <span className="font-medium">{numeroApr(a.number)} · {a.title}</span>
              <span className="block text-slate-500">{STATUS_APR[a.status]}</span>
            </Link>
          </li>
        ))}
        {!aprs?.length && <li className="px-4 py-4 text-center text-slate-500">Nenhuma APR em aberto.</li>}
      </ul>

      <h2 className="mt-5 font-semibold">Minhas PTs</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
        {(pts ?? []).map((p) => (
          <li key={p.id}>
            <Link href={`/meu/pt/${p.id}`} className="block px-4 py-3 active:bg-slate-50">
              <span className="font-medium">{numeroPt(p.number)} · {TIPOS_PT[p.kind]?.nome}</span>
              <span className="block text-slate-500">{STATUS_PT[p.status]}</span>
            </Link>
          </li>
        ))}
        {!pts?.length && <li className="px-4 py-4 text-center text-slate-500">Nenhuma PT em aberto.</li>}
      </ul>

      <details className="mt-6">
        <summary className="btn w-full">+ Nova APR</summary>
        <div className="mt-2">
          <NovaApr setores={setores} voltar="/meu/apr" />
        </div>
      </details>
      <details className="mt-3">
        <summary className="btn-ghost w-full">+ Pedir PT</summary>
        <div className="mt-2">
          <NovaPt setores={setores} aprs={aprovadas} voltar="/meu/pt" />
        </div>
      </details>
    </div>
  );
}
