import Link from "next/link";
import { notFound } from "next/navigation";
import { Erro } from "@/components/Erro";
import { dataBR, hoje } from "@/lib/datas";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { rotuloTreinamento } from "@/lib/treinamento";
import { criarTurma, removerTreinamento, salvarCargosExigidos, salvarTreinamento } from "../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> };

export default async function TreinamentoPage({ params, searchParams }: Props) {
  const [{ id }, { erro }] = await Promise.all([params, searchParams]);
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: t }, { data: cargos }, { data: exigidos }, { data: turmas }] = await Promise.all([
    supabase
      .from("trainings")
      .select("id, name, norm_reference, workload_hours, validity_months, syllabus, active")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("job_roles").select("id, name").eq("organization_id", org.id).order("name"),
    supabase.from("training_job_roles").select("job_role_id").eq("training_id", id),
    supabase
      .from("training_sessions")
      .select("id, held_on, instructor, location, training_attendances(count)")
      .eq("training_id", id)
      .order("held_on", { ascending: false }),
  ]);
  if (!t) notFound();
  const marcados = new Set((exigidos ?? []).map((e) => e.job_role_id));
  const lista = (turmas ?? []) as unknown as {
    id: string;
    held_on: string;
    instructor: string | null;
    location: string | null;
    training_attendances: { count: number }[];
  }[];

  return (
    <div>
      <Link href="/app/treinamentos" className="text-sm text-emerald-700 underline">← Treinamentos</Link>
      <h1 className="mt-3 text-2xl font-bold">{rotuloTreinamento(t)}</h1>
      <Erro mensagem={erro} />

      <form action={salvarTreinamento} className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <input type="hidden" name="id" value={t.id} />
        <label className="text-sm sm:col-span-2">
          Treinamento
          <input name="nome" required defaultValue={t.name} className="input mt-1" />
        </label>
        <label className="text-sm">
          Norma
          <input name="nr" defaultValue={t.norm_reference ?? ""} className="input mt-1" />
        </label>
        <label className="text-sm">
          Carga horária (h)
          <input name="carga" inputMode="decimal" defaultValue={t.workload_hours ?? ""} className="input mt-1" />
        </label>
        <label className="text-sm">
          Validade (meses)
          <input name="validade" type="number" min={1} defaultValue={t.validity_months ?? ""} className="input mt-1" />
        </label>
        <label className="text-sm sm:col-span-3">
          Conteúdo programático
          <textarea name="conteudo" defaultValue={t.syllabus ?? ""} rows={2} className="input mt-1" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked={t.active} /> Em uso
        </label>
        <div className="sm:col-span-3">
          <button className="btn">Salvar</button>
        </div>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <form action={salvarCargosExigidos} className="rounded-lg border border-slate-200 bg-white p-4">
          <input type="hidden" name="id" value={t.id} />
          <p className="font-semibold">Exigido para os cargos</p>
          <div className="mt-2 grid gap-1">
            {(cargos ?? []).map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="cargos" value={c.id} defaultChecked={marcados.has(c.id)} /> {c.name}
              </label>
            ))}
            {!cargos?.length && (
              <p className="text-sm text-slate-500">
                Cadastre cargos em <Link href="/app/cargos" className="underline">Cargos e funções</Link>.
              </p>
            )}
          </div>
          <button className="btn mt-3">Salvar cargos</button>
        </form>

        <form action={criarTurma} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-4">
          <input type="hidden" name="treinamento" value={t.id} />
          <p className="font-semibold">Nova turma</p>
          <label className="text-sm">
            Data
            <input name="data" type="date" required defaultValue={hoje()} className="input mt-1" />
          </label>
          <label className="text-sm">
            Instrutor
            <input name="instrutor" className="input mt-1" />
          </label>
          <label className="text-sm">
            Local
            <input name="local" className="input mt-1" />
          </label>
          <div>
            <button className="btn">Criar turma e escolher participantes</button>
          </div>
        </form>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Turmas</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {lista.map((s) => (
          <li key={s.id} className="px-4 py-2">
            <Link href={`/app/treinamentos/turma/${s.id}`} className="underline">{dataBR(s.held_on)}</Link>
            {s.instructor ? ` · ${s.instructor}` : ""}
            {s.location ? ` · ${s.location}` : ""} · {s.training_attendances[0]?.count ?? 0} participante(s)
          </li>
        ))}
        {!lista.length && <li className="px-4 py-4 text-center text-slate-500">Nenhuma turma ainda.</li>}
      </ul>

      <form action={removerTreinamento} className="mt-8">
        <input type="hidden" name="id" value={t.id} />
        <button className="text-xs text-red-600 hover:underline">Excluir este treinamento</button>
      </form>
    </div>
  );
}
