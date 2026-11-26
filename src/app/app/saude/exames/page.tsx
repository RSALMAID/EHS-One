import Link from "next/link";
import { Erro } from "@/components/Erro";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { adicionarTipoExame, exigirExame, removerExigencia, removerTipoExame } from "../actions";

type Props = { searchParams: Promise<{ erro?: string }> };

export default async function ExamesPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: tipos }, { data: cargos }, { data: exigencias }] = await Promise.all([
    supabase.from("exam_types").select("id, name").eq("organization_id", org.id).order("name"),
    supabase.from("job_roles").select("id, name").eq("organization_id", org.id).order("name"),
    supabase.from("exam_job_roles").select("exam_type_id, job_role_id, periodicity_months").eq("organization_id", org.id),
  ]);
  const nome = (lista: { id: string; name: string }[] | null, id: string) => lista?.find((x) => x.id === id)?.name ?? "";

  return (
    <div>
      <Link href="/app/saude" className="text-sm text-emerald-700 underline">← Saúde ocupacional</Link>
      <h1 className="mt-3 text-2xl font-bold">Exames por cargo (PCMSO)</h1>
      <p className="text-sm text-slate-600">
        Cadastre os exames que o médico do PCMSO definiu e diga, para cada cargo, de quantos em quantos meses repetir.
      </p>
      <Erro mensagem={erro} />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
          <p className="font-semibold">Exames</p>
          <form action={adicionarTipoExame} className="mt-2 flex gap-2">
            <input name="nome" required className="input" placeholder="Audiometria" />
            <button className="btn">Adicionar</button>
          </form>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {(tipos ?? []).map((t) => (
              <li key={t.id} className="flex justify-between py-1">
                {t.name}
                <form action={removerTipoExame}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="text-xs text-red-600 hover:underline">Remover</button>
                </form>
              </li>
            ))}
            {!tipos?.length && <li className="py-2 text-slate-500">Nenhum exame cadastrado.</li>}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
          <p className="font-semibold">Exigir exame para um cargo</p>
          <form action={exigirExame} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_6rem_auto] sm:items-end">
            <label className="text-sm">
              Cargo
              <select name="cargo" required className="input mt-1">
                <option value="">—</option>
                {(cargos ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Exame
              <select name="exame" required className="input mt-1">
                <option value="">—</option>
                {(tipos ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              A cada (meses)
              <input name="meses" type="number" min={1} defaultValue={12} className="input mt-1" />
            </label>
            <button className="btn">Salvar</button>
          </form>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {(exigencias ?? [])
              .map((e) => ({ ...e, cargo: nome(cargos, e.job_role_id), exame: nome(tipos, e.exam_type_id) }))
              .sort((a, b) => a.cargo.localeCompare(b.cargo) || a.exame.localeCompare(b.exame))
              .map((e) => (
                <li key={e.exam_type_id + e.job_role_id} className="flex justify-between py-1">
                  <span>
                    <strong>{e.cargo}</strong> · {e.exame} · a cada {e.periodicity_months} meses
                  </span>
                  <form action={removerExigencia}>
                    <input type="hidden" name="exame" value={e.exam_type_id} />
                    <input type="hidden" name="cargo" value={e.job_role_id} />
                    <button className="text-xs text-red-600 hover:underline">Remover</button>
                  </form>
                </li>
              ))}
            {!exigencias?.length && <li className="py-2 text-slate-500">Nenhuma exigência ainda.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
