import Link from "next/link";
import { Erro } from "@/components/Erro";
import { dataBR, hoje, somarDias } from "@/lib/datas";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { ROTULO, rotuloTreinamento, situacao, type Participacao, type Treinamento } from "@/lib/treinamento";
import { criarAcaoTreinamento } from "../actions";

type Props = { searchParams: Promise<{ erro?: string }> };

type Presenca = { worker_id: string; training_sessions: { training_id: string; held_on: string } | null };

export default async function MatrizPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: treinamentos }, { data: exigidos }, { data: trabalhadores }, { data: cargos }, { data: presencas }] =
    await Promise.all([
      supabase
        .from("trainings")
        .select("id, name, norm_reference, workload_hours, validity_months, active")
        .eq("organization_id", org.id)
        .eq("active", true)
        .order("name"),
      supabase.from("training_job_roles").select("training_id, job_role_id").eq("organization_id", org.id),
      supabase
        .from("workers")
        .select("id, full_name, job_role_id")
        .eq("organization_id", org.id)
        .eq("active", true)
        .order("full_name"),
      supabase.from("job_roles").select("id, name").eq("organization_id", org.id),
      supabase
        .from("training_attendances")
        .select("worker_id, training_sessions(training_id, held_on)")
        .eq("organization_id", org.id)
        .eq("approved", true),
    ]);
  const lista = (treinamentos ?? []) as Treinamento[];
  const participacoes: Participacao[] = ((presencas ?? []) as unknown as Presenca[])
    .filter((p) => p.training_sessions)
    .map((p) => ({ worker_id: p.worker_id, training_id: p.training_sessions!.training_id, held_on: p.training_sessions!.held_on }));
  const exige = (cargo: string | null, treino: string) =>
    !!cargo && (exigidos ?? []).some((e) => e.job_role_id === cargo && e.training_id === treino);
  const colunas = lista.filter((t) => (exigidos ?? []).some((e) => e.training_id === t.id));
  const nomeCargo = (id: string | null) => cargos?.find((c) => c.id === id)?.name ?? "sem cargo";

  const problemas = (trabalhadores ?? []).flatMap((w) =>
    colunas
      .filter((t) => exige(w.job_role_id, t.id))
      .map((t) => ({ w, t, s: situacao(t, participacoes, w.id) }))
      .filter((x) => x.s.tipo !== "ok"),
  );

  return (
    <div>
      <Link href="/app/treinamentos" className="text-sm text-emerald-700 underline">← Treinamentos</Link>
      <h1 className="mt-3 text-2xl font-bold">Matriz de treinamentos</h1>
      <p className="text-sm text-slate-600">
        Linhas: trabalhadores ativos. Colunas: treinamentos exigidos por algum cargo. Célula vazia = não exigido para o cargo.
      </p>
      <Erro mensagem={erro} />

      {colunas.length === 0 ? (
        <p className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm text-slate-600">
          Nenhum treinamento tem cargos marcados ainda. Abra um treinamento e marque os cargos que precisam dele.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-100">
                <th className="px-2 py-1">Trabalhador</th>
                <th className="px-2 py-1">Cargo</th>
                {colunas.map((t) => (
                  <th key={t.id} className="px-2 py-1">{rotuloTreinamento(t)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(trabalhadores ?? []).map((w) => (
                <tr key={w.id} className="border-b border-slate-200">
                  <td className="px-2 py-1">{w.full_name}</td>
                  <td className="px-2 py-1 text-slate-500">{nomeCargo(w.job_role_id)}</td>
                  {colunas.map((t) => {
                    if (!exige(w.job_role_id, t.id)) return <td key={t.id} className="px-2 py-1" />;
                    const s = situacao(t, participacoes, w.id);
                    const r = ROTULO[s.tipo];
                    return (
                      <td key={t.id} className="px-2 py-1">
                        <span className={`rounded px-1.5 py-0.5 ${r.classe}`}>{r.texto}</span>
                        {s.tipo !== "nunca" && s.vence && <span className="ml-1 text-slate-500">até {dataBR(s.vence)}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-8 text-lg font-semibold">Pendências ({problemas.length})</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
        {problemas.map(({ w, t, s }) => {
          const texto =
            s.tipo === "nunca"
              ? "nunca fez"
              : s.tipo === "vencido"
                ? `vencido desde ${dataBR(s.vence)}`
                : `vence em ${dataBR(s.vence)}`;
          return (
            <li key={w.id + t.id} className="flex items-center justify-between gap-3 px-4 py-2">
              <span>
                <strong>{w.full_name}</strong> · {rotuloTreinamento(t)} ·{" "}
                <span className={s.tipo === "vence" ? "text-amber-700" : "text-red-700"}>{texto}</span>
              </span>
              <span className="flex gap-3">
                <Link href={`/app/treinamentos/${t.id}`} className="text-xs text-emerald-700 hover:underline">Nova turma</Link>
                <form action={criarAcaoTreinamento}>
                  <input type="hidden" name="treinamento" value={t.id} />
                  <input type="hidden" name="problema" value={`${w.full_name}: ${rotuloTreinamento(t)} ${texto}`} />
                  <input type="hidden" name="acao" value={`Incluir ${w.full_name} na próxima turma de ${rotuloTreinamento(t)}`} />
                  <input type="hidden" name="prazo" value={somarDias(hoje(), 15)} />
                  <button className="text-xs text-emerald-700 hover:underline">Criar ação</button>
                </form>
              </span>
            </li>
          );
        })}
        {!problemas.length && <li className="px-4 py-4 text-center text-slate-500">Nenhuma pendência.</li>}
      </ul>
    </div>
  );
}
