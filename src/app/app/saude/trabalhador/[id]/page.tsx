import Link from "next/link";
import { notFound } from "next/navigation";
import { Erro } from "@/components/Erro";
import { dataBR, hoje } from "@/lib/datas";
import { requireOrg } from "@/lib/org";
import { lancaAso, RESULTADOS, situacaoExame, TIPOS_ASO, veExames, type ExameFeito, type Exigencia } from "@/lib/saude";
import { createClient } from "@/lib/supabase/server";
import { registrarExame, removerAso, removerExame } from "../../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> };

type Exame = { id: string; exam_type_id: string; performed_on: string; notes: string | null; worker_id: string };

export default async function ProntuarioPage({ params, searchParams }: Props) {
  const [{ id }, { erro }] = await Promise.all([params, searchParams]);
  const org = await requireOrg();
  if (org.role === "trabalhador" || org.role === "consultor") notFound();
  const exames = veExames(org.role);
  const supabase = await createClient();
  const [{ data: w }, { data: asos }, { data: tipos }, { data: exigencias }, { data: feitos }] = await Promise.all([
    supabase.from("workers").select("id, full_name, job_role_id, job_roles(name)").eq("id", id).maybeSingle(),
    supabase
      .from("asos")
      .select("id, kind, issued_on, result, restrictions, physician_name, physician_crm, next_due")
      .eq("worker_id", id)
      .order("issued_on", { ascending: false }),
    supabase.from("exam_types").select("id, name").eq("organization_id", org.id).order("name"),
    supabase.from("exam_job_roles").select("exam_type_id, job_role_id, periodicity_months").eq("organization_id", org.id),
    exames
      ? supabase
          .from("worker_exams")
          .select("id, worker_id, exam_type_id, performed_on, notes")
          .eq("worker_id", id)
          .order("performed_on", { ascending: false })
      : Promise.resolve({ data: [] as Exame[] }),
  ]);
  if (!w) notFound();
  const trab = w as unknown as { id: string; full_name: string; job_role_id: string | null; job_roles: { name: string } | null };
  const nomeExame = (eid: string) => tipos?.find((t) => t.id === eid)?.name ?? "";
  const lista = (feitos ?? []) as Exame[];
  const exigidos = ((exigencias ?? []) as Exigencia[]).filter((e) => e.job_role_id === trab.job_role_id);
  const voltar = `/app/saude/trabalhador/${id}`;

  return (
    <div>
      <Link href="/app/saude" className="text-sm text-emerald-700 underline">← Saúde ocupacional</Link>
      <h1 className="mt-3 text-2xl font-bold">{trab.full_name}</h1>
      <p className="text-sm text-slate-600">Cargo: {trab.job_roles?.name ?? "sem cargo"}</p>
      <Erro mensagem={erro} />

      <div className="mt-4 flex gap-3">
        {lancaAso(org.role) && (
          <Link href={`/app/saude?trabalhador=${id}#novo-aso`} className="btn">Lançar ASO</Link>
        )}
      </div>

      <h2 className="mt-6 text-lg font-semibold">ASOs</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {(asos ?? []).map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-2">
            <span>
              {dataBR(a.issued_on)} · {TIPOS_ASO[a.kind]} ·{" "}
              <span className={RESULTADOS[a.result].classe}>{RESULTADOS[a.result].texto}</span>
              {a.restrictions ? ` · restrições: ${a.restrictions}` : ""}
              {a.physician_name ? ` · Dr(a). ${a.physician_name}` : ""}
              {a.physician_crm ? ` (CRM ${a.physician_crm})` : ""}
              {a.next_due ? ` · próximo ${dataBR(a.next_due)}` : ""}
            </span>
            {lancaAso(org.role) && (
              <form action={removerAso}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="voltar" value={voltar} />
                <button className="text-xs text-red-600 hover:underline">Excluir</button>
              </form>
            )}
          </li>
        ))}
        {!asos?.length && <li className="px-4 py-4 text-center text-slate-500">Nenhum ASO.</li>}
      </ul>

      {exames && (
        <>
          <h2 className="mt-8 text-lg font-semibold">Exames exigidos pelo cargo</h2>
          <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
            {exigidos.map((e) => {
              const s = situacaoExame(e, lista as ExameFeito[], id);
              return (
                <li key={e.exam_type_id} className="px-4 py-2">
                  {nomeExame(e.exam_type_id)} · a cada {e.periodicity_months} meses ·{" "}
                  {s.tipo === "nunca" ? (
                    <span className="text-red-700">nunca feito</span>
                  ) : (
                    <span className={s.tipo === "ok" ? "text-emerald-700" : s.tipo === "vence" ? "text-amber-700" : "text-red-700"}>
                      feito em {dataBR(s.feito)}, {s.tipo === "vencido" ? "vencido em" : "vale até"} {dataBR(s.vence)}
                    </span>
                  )}
                </li>
              );
            })}
            {!exigidos.length && <li className="px-4 py-4 text-center text-slate-500">O cargo não tem exames exigidos.</li>}
          </ul>

          <form action={registrarExame} className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_10rem_2fr_auto] sm:items-end">
            <input type="hidden" name="trabalhador" value={id} />
            <label className="text-sm">
              Exame realizado
              <select name="exame" required className="input mt-1">
                <option value="">—</option>
                {(tipos ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Data
              <input name="data" type="date" required defaultValue={hoje()} className="input mt-1" />
            </label>
            <label className="text-sm">
              Observações (só admin e médico veem)
              <input name="obs" className="input mt-1" />
            </label>
            <button className="btn">Lançar</button>
          </form>

          <h2 className="mt-6 text-lg font-semibold">Histórico de exames</h2>
          <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
            {lista.map((x) => (
              <li key={x.id} className="flex items-start justify-between gap-3 px-4 py-2">
                <span>
                  {dataBR(x.performed_on)} · {nomeExame(x.exam_type_id)}
                  {x.notes ? ` · ${x.notes}` : ""}
                </span>
                <form action={removerExame}>
                  <input type="hidden" name="id" value={x.id} />
                  <input type="hidden" name="trabalhador" value={id} />
                  <button className="text-xs text-red-600 hover:underline">Excluir</button>
                </form>
              </li>
            ))}
            {!lista.length && <li className="px-4 py-4 text-center text-slate-500">Nenhum exame lançado.</li>}
          </ul>
        </>
      )}
    </div>
  );
}
