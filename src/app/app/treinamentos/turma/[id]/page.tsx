import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { Erro } from "@/components/Erro";
import { dataBR, somarMeses } from "@/lib/datas";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { rotuloTreinamento } from "@/lib/treinamento";
import { TIPOS_EVIDENCIA } from "@/lib/autorizacoes";
import { adicionarEvidencia, removerEvidencia } from "../../../autorizacoes/actions";
import { adicionarParticipantes, alternarAprovacao, removerParticipante, removerTurma } from "../../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> };

type Turma = {
  id: string;
  held_on: string;
  instructor: string | null;
  location: string | null;
  training_id: string;
  trainings: { id: string; name: string; norm_reference: string | null; workload_hours: number | null; validity_months: number | null };
};
type Participante = { id: string; approved: boolean; worker_id: string; workers: { full_name: string; cpf: string | null } | null };

export default async function TurmaPage({ params, searchParams }: Props) {
  const [{ id }, { erro }] = await Promise.all([params, searchParams]);
  const org = await requireOrg();
  const supabase = await createClient();
  const { data } = await supabase
    .from("training_sessions")
    .select("id, held_on, instructor, location, training_id, trainings(id, name, norm_reference, workload_hours, validity_months)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const turma = data as unknown as Turma;
  const [{ data: part }, { data: trabalhadores }, { data: exigidos }, { data: evid }] = await Promise.all([
    supabase
      .from("training_attendances")
      .select("id, approved, worker_id, workers(full_name, cpf)")
      .eq("session_id", id),
    supabase
      .from("workers")
      .select("id, full_name, job_role_id")
      .eq("organization_id", org.id)
      .eq("active", true)
      .order("full_name"),
    supabase.from("training_job_roles").select("job_role_id").eq("training_id", turma.training_id),
    supabase
      .from("training_evidences")
      .select("id, kind, file_path, file_name, notes, workers(full_name)")
      .eq("session_id", id)
      .order("created_at"),
  ]);
  const evidencias = (evid ?? []) as unknown as {
    id: string;
    kind: string;
    file_path: string;
    file_name: string;
    notes: string | null;
    workers: { full_name: string } | null;
  }[];
  const links = new Map<string, string>();
  if (evidencias.length) {
    const { data: assinadas } = await supabase.storage
      .from("capacitacoes")
      .createSignedUrls(evidencias.map((e) => e.file_path), 3600);
    for (const s of assinadas ?? []) if (s.path && s.signedUrl) links.set(s.path, s.signedUrl);
  }
  const participantes = ((part ?? []) as unknown as Participante[]).sort((a, b) =>
    (a.workers?.full_name ?? "").localeCompare(b.workers?.full_name ?? ""),
  );
  const ja = new Set(participantes.map((p) => p.worker_id));
  const cargosExigidos = new Set((exigidos ?? []).map((e) => e.job_role_id));
  const disponiveis = (trabalhadores ?? [])
    .filter((w) => !ja.has(w.id))
    .sort((a, b) => Number(cargosExigidos.has(b.job_role_id ?? "")) - Number(cargosExigidos.has(a.job_role_id ?? "")));
  const t = turma.trainings;
  const vence = t.validity_months ? somarMeses(turma.held_on, t.validity_months) : null;

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/app/treinamentos/${t.id}`} className="text-sm text-emerald-700 underline">← {t.name}</Link>
        <BotaoImprimir />
      </div>
      <h1 className="mt-3 text-2xl font-bold">Lista de presença</h1>
      <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
        <p><strong>Empresa:</strong> {org.name}</p>
        <p><strong>Treinamento:</strong> {rotuloTreinamento(t)}</p>
        <p><strong>Data:</strong> {dataBR(turma.held_on)}</p>
        <p><strong>Carga horária:</strong> {t.workload_hours ? `${t.workload_hours} h` : "—"}</p>
        <p><strong>Instrutor:</strong> {turma.instructor ?? "—"}</p>
        <p><strong>Local:</strong> {turma.location ?? "—"}</p>
        <p><strong>Validade:</strong> {vence ? `até ${dataBR(vence)}` : "não vence"}</p>
      </div>
      <Erro mensagem={erro} />

      <table className="mt-4 w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-300 bg-slate-100">
            <th className="px-2 py-1">Nome</th>
            <th className="px-2 py-1">CPF</th>
            <th className="px-2 py-1">Resultado</th>
            <th className="px-2 py-1">Assinatura</th>
            <th className="px-2 py-1 print:hidden" />
          </tr>
        </thead>
        <tbody>
          {participantes.map((p) => (
            <tr key={p.id} className="border-b border-slate-200">
              <td className="px-2 py-2">{p.workers?.full_name}</td>
              <td className="px-2 py-2">{p.workers?.cpf ?? ""}</td>
              <td className="px-2 py-2">
                <form action={alternarAprovacao} className="inline">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="turma" value={turma.id} />
                  <input type="hidden" name="aprovado" value={String(p.approved)} />
                  <button className={p.approved ? "text-emerald-700" : "text-red-700"} title="Clique para alternar">
                    {p.approved ? "Aprovado" : "Não aprovado / faltou"}
                  </button>
                </form>
              </td>
              <td className="w-48 px-2 py-2"><div className="h-6 border-b border-slate-400" /></td>
              <td className="px-2 py-2 print:hidden">
                <form action={removerParticipante}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="turma" value={turma.id} />
                  <button className="text-xs text-red-600 hover:underline">Retirar</button>
                </form>
              </td>
            </tr>
          ))}
          {!participantes.length && (
            <tr><td colSpan={5} className="px-2 py-4 text-center text-slate-500">Nenhum participante ainda.</td></tr>
          )}
        </tbody>
      </table>
      <div className="mt-10 hidden w-64 border-t border-slate-500 pt-1 text-center text-xs print:block">
        Instrutor: {turma.instructor ?? ""}
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm print:hidden">
        <p className="font-semibold">Evidências da turma</p>
        <p className="text-xs text-slate-500">
          Guarde a lista de presença assinada, os certificados, o conteúdo e a avaliação. O certificado de uma pessoa
          aparece para ela no Meu EHS.
        </p>
        <ul className="mt-2 divide-y divide-slate-100">
          {evidencias.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="text-slate-500">{TIPOS_EVIDENCIA[e.kind]}</span>
              {links.get(e.file_path) ? (
                <a href={links.get(e.file_path)} target="_blank" rel="noreferrer" className="text-emerald-700 underline">
                  📎 {e.file_name}
                </a>
              ) : (
                <span>{e.file_name}</span>
              )}
              {e.workers && <span>· {e.workers.full_name}</span>}
              {e.notes && <span className="text-slate-500">· {e.notes}</span>}
              <form action={removerEvidencia} className="ml-auto">
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="turma" value={turma.id} />
                <button className="text-xs text-red-600 hover:underline">remover</button>
              </form>
            </li>
          ))}
          {!evidencias.length && <li className="py-2 text-slate-500">Nenhuma evidência anexada.</li>}
        </ul>
        <form action={adicionarEvidencia} className="mt-3 grid gap-2 sm:grid-cols-4 sm:items-end">
          <input type="hidden" name="turma" value={turma.id} />
          <label>
            Tipo
            <select name="tipo" className="input mt-1" defaultValue="lista_presenca">
              {Object.entries(TIPOS_EVIDENCIA).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Pessoa (para certificado)
            <select name="trabalhador" className="input mt-1" defaultValue="">
              <option value="">—</option>
              {participantes.map((p) => (
                <option key={p.worker_id} value={p.worker_id}>{p.workers?.full_name}</option>
              ))}
            </select>
          </label>
          <label>
            Arquivo
            <input name="arquivo" type="file" required accept="application/pdf,image/*" className="mt-1 block text-xs" />
          </label>
          <label>
            Observação
            <input name="obs" className="input mt-1" />
          </label>
          <div className="sm:col-span-4">
            <button className="btn">Anexar</button>
          </div>
        </form>
      </section>

      <form action={adicionarParticipantes} className="mt-6 rounded-lg border border-slate-200 bg-white p-4 print:hidden">
        <input type="hidden" name="turma" value={turma.id} />
        <p className="font-semibold">Adicionar participantes</p>
        <p className="text-xs text-slate-500">Quem tem cargo que exige este treinamento aparece primeiro.</p>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {disponiveis.map((w) => (
            <label key={w.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="trabalhadores" value={w.id} /> {w.full_name}
              {cargosExigidos.has(w.job_role_id ?? "") && <span className="text-xs text-amber-700">· exigido</span>}
            </label>
          ))}
          {!disponiveis.length && <p className="text-sm text-slate-500">Todos os trabalhadores ativos já estão na turma.</p>}
        </div>
        {disponiveis.length > 0 && <button className="btn mt-3">Adicionar selecionados</button>}
      </form>

      <form action={removerTurma} className="mt-8 print:hidden">
        <input type="hidden" name="id" value={turma.id} />
        <input type="hidden" name="treinamento" value={t.id} />
        <button className="text-xs text-red-600 hover:underline">Excluir esta turma</button>
      </form>
    </div>
  );
}
