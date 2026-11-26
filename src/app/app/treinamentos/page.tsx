import { VazioLista } from "@/components/EstadoVazio";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { Erro } from "@/components/Erro";
import { dataBR } from "@/lib/datas";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { rotuloTreinamento } from "@/lib/treinamento";
import { adicionarTreinamento } from "./actions";

type Props = { searchParams: Promise<{ erro?: string }> };

type Turma = { id: string; held_on: string; instructor: string | null; trainings: { name: string; norm_reference: string | null } | null };

export default async function TreinamentosPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: treinamentos }, { data: exigidos }, { data: cargos }, { data: turmas }] = await Promise.all([
    supabase
      .from("trainings")
      .select("id, name, norm_reference, workload_hours, validity_months, active")
      .eq("organization_id", org.id)
      .order("active", { ascending: false })
      .order("name"),
    supabase.from("training_job_roles").select("training_id, job_role_id").eq("organization_id", org.id),
    supabase.from("job_roles").select("id, name").eq("organization_id", org.id),
    supabase
      .from("training_sessions")
      .select("id, held_on, instructor, trainings(name, norm_reference)")
      .eq("organization_id", org.id)
      .order("held_on", { ascending: false })
      .limit(10),
  ]);
  const cargosDo = (id: string) =>
    (exigidos ?? [])
      .filter((e) => e.training_id === id)
      .map((e) => cargos?.find((c) => c.id === e.job_role_id)?.name)
      .filter(Boolean)
      .join(", ");
  const ultimas = (turmas ?? []) as unknown as Turma[];

  return (
    <div>
      <h1 className="titulo">Treinamentos</h1>
      <p className="mt-1 text-sm text-slate-600">
        Cadastre os treinamentos, diga quais cargos precisam de cada um e registre as turmas. O sistema calcula quem
        está em dia, vencendo ou sem treinamento.
      </p>
      <Erro mensagem={erro} />

      <div className="mt-4">
        <Link href="/app/treinamentos/pendencias" className="btn">Matriz e pendências</Link>
      </div>

      <form action={adicionarTreinamento} className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:grid-cols-4">
        <label className="text-sm sm:col-span-2">
          Treinamento
          <input name="nome" required className="input mt-1" placeholder="Trabalho em altura" />
        </label>
        <label className="text-sm">
          Norma
          <input name="nr" className="input mt-1" placeholder="NR-35" />
        </label>
        <label className="text-sm">
          Carga horária (h)
          <input name="carga" inputMode="decimal" className="input mt-1" placeholder="8" />
        </label>
        <label className="text-sm">
          Validade (meses)
          <input name="validade" type="number" min={1} className="input mt-1" placeholder="24" />
          <span className="text-xs text-slate-500">vazio = não vence</span>
        </label>
        <label className="text-sm sm:col-span-3">
          Conteúdo programático (opcional)
          <input name="conteudo" className="input mt-1" />
        </label>
        <div>
          <button className="btn">Adicionar</button>
        </div>
      </form>

      <ul className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
        {(treinamentos ?? []).map((t) => (
          <li key={t.id} className={`px-4 py-3 ${t.active ? "" : "opacity-50"}`}>
            <Link href={`/app/treinamentos/${t.id}`} className="font-medium text-emerald-800 underline">
              {rotuloTreinamento(t)}
            </Link>
            <p className="text-slate-600">
              {t.workload_hours ? `${t.workload_hours} h` : "carga não informada"} ·{" "}
              {t.validity_months ? `vale ${t.validity_months} meses` : "não vence"}
              {!t.active && " · fora de uso"}
            </p>
            <p className="text-slate-500">Exigido para: {cargosDo(t.id) || "nenhum cargo ainda"}</p>
          </li>
        ))}
        {!treinamentos?.length && (
          <VazioLista
            icone={GraduationCap}
            titulo="Nenhum treinamento cadastrado"
            texto="Cadastre os treinamentos (NR-35, NR-10, integração…) com carga horária e validade; depois abra turmas."
          />
        )}
      </ul>

      <h2 className="mt-8 text-lg font-semibold">Últimas turmas</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
        {ultimas.map((t) => (
          <li key={t.id} className="px-4 py-2">
            <Link href={`/app/treinamentos/turma/${t.id}`} className="underline">
              {dataBR(t.held_on)} · {t.trainings ? rotuloTreinamento(t.trainings) : ""}
            </Link>
            {t.instructor ? ` · ${t.instructor}` : ""}
          </li>
        ))}
        {!ultimas.length && <li className="px-4 py-4 text-center text-slate-500">Nenhuma turma ainda. Abra um treinamento para criar.</li>}
      </ul>
    </div>
  );
}
