import Link from "next/link";
import { Erro } from "@/components/Erro";
import { dataBR, hoje } from "@/lib/datas";
import { NORMAS, numeroAuditoria, STATUS_AUDITORIA, TIPOS_AUDITORIA } from "@/lib/iso";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { criarAuditoria } from "../actions";

type Props = { searchParams: Promise<{ erro?: string }> };

export default async function AuditoriasPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const { data } = await supabase
    .from("audits")
    .select("id, number, standard, kind, scope, planned_on, done_on, auditor, status, audit_findings(kind)")
    .eq("organization_id", org.id)
    .order("planned_on", { ascending: false });
  const h = hoje();

  return (
    <div>
      <Link href="/app/iso" className="text-sm text-emerald-700 underline">← ISO 45001 e 14001</Link>
      <h1 className="mt-3 text-2xl font-bold">Auditorias</h1>
      <p className="mt-1 text-sm text-slate-600">
        Planeje o programa de auditorias internas (item 9.2), registre as externas e de certificação, e transforme cada não
        conformidade em ação corretiva.
      </p>
      <Erro mensagem={erro} />

      <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {(data ?? []).map((a) => {
          const achados = (a.audit_findings as { kind: string }[]) ?? [];
          const ncs = achados.filter((f) => f.kind === "nc_maior" || f.kind === "nc_menor").length;
          const atrasada = a.status === "planejada" && a.planned_on < h;
          return (
            <li key={a.id} className="px-4 py-3">
              <Link href={`/app/iso/auditorias/${a.id}`} className="font-medium text-emerald-800 underline">
                {numeroAuditoria(a.number)} · {TIPOS_AUDITORIA[a.kind]} · {NORMAS[a.standard]}
              </Link>
              <div className="text-slate-500">
                {STATUS_AUDITORIA[a.status]} · {a.status === "realizada" && a.done_on ? `em ${dataBR(a.done_on)}` : `planejada para ${dataBR(a.planned_on)}`}
                {a.auditor ? ` · ${a.auditor}` : ""}
                {a.scope ? ` · ${a.scope}` : ""}
                {achados.length ? ` · ${achados.length} constatação(ões), ${ncs} NC` : ""}
                {atrasada && <span className="text-red-700"> · data passou</span>}
              </div>
            </li>
          );
        })}
        {!data?.length && <li className="px-4 py-6 text-center text-slate-500">Nenhuma auditoria registrada.</li>}
      </ul>

      <details className="mt-6" open={!data?.length}>
        <summary className="cursor-pointer text-sm font-medium text-emerald-800">+ Nova auditoria</summary>
        <form action={criarAuditoria} className="mt-2 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
          <label>
            Tipo
            <select name="tipo" className="input mt-1" defaultValue="interna">
              {Object.entries(TIPOS_AUDITORIA).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
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
            Data planejada
            <input name="data" type="date" required className="input mt-1" />
          </label>
          <label>
            Auditor(es)
            <input name="auditor" className="input mt-1" />
          </label>
          <label className="sm:col-span-2">
            Escopo (áreas, processos, itens da norma)
            <input name="escopo" className="input mt-1" />
          </label>
          <div className="sm:col-span-2">
            <button className="btn">Criar auditoria</button>
            <span className="ml-3 text-xs text-slate-500">O auditor interno não deve auditar o próprio trabalho.</span>
          </div>
        </form>
      </details>
    </div>
  );
}
