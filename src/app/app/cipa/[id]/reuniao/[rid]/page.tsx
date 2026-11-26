import Link from "next/link";
import { notFound } from "next/navigation";
import { Erro } from "@/components/Erro";
import { STATUS_ACAO } from "@/lib/acoes";
import { CARGOS_CIPA, TIPOS_REUNIAO } from "@/lib/cipa";
import { dataBR, hoje, somarDias } from "@/lib/datas";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { criarAcaoReuniao, excluirReuniao, salvarReuniao } from "../../../actions";

type Props = { params: Promise<{ id: string; rid: string }>; searchParams: Promise<{ erro?: string; ok?: string }> };

type Membro = { id: string; role: string; left_on: string | null; workers: { full_name: string } | null };

export default async function ReuniaoPage({ params, searchParams }: Props) {
  const [{ id, rid }, { erro, ok }] = await Promise.all([params, searchParams]);
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: r }, { data: g }, { data: m }, { data: presencas }, { data: acoes }, { data: trabalhadores }] =
    await Promise.all([
      supabase.from("cipa_meetings").select("*").eq("id", rid).eq("mandate_id", id).maybeSingle(),
      supabase.from("cipa_mandates").select("name").eq("id", id).maybeSingle(),
      supabase.from("cipa_members").select("id, role, left_on, workers(full_name)").eq("mandate_id", id),
      supabase.from("cipa_attendances").select("member_id").eq("meeting_id", rid),
      supabase
        .from("actions")
        .select("id, number, problem, action, due_date, status")
        .eq("organization_id", org.id)
        .eq("origin", "cipa")
        .eq("origin_ref", rid)
        .order("number"),
      supabase.from("workers").select("id, full_name").eq("organization_id", org.id).eq("active", true).order("full_name"),
    ]);
  if (!r || !g) notFound();
  const presentes = new Set((presencas ?? []).map((p) => p.member_id));
  const membros = ((m ?? []) as unknown as Membro[])
    .filter((x) => !x.left_on || x.left_on >= r.held_on || presentes.has(x.id))
    .sort((a, b) => (a.workers?.full_name ?? "").localeCompare(b.workers?.full_name ?? ""));

  return (
    <div>
      <Link href={`/app/cipa/${id}`} className="text-sm text-emerald-700 underline">← {g.name}</Link>
      <h1 className="mt-3 text-xl font-bold">
        Reunião {TIPOS_REUNIAO[r.kind].toLowerCase()} de {dataBR(r.held_on)}
      </h1>
      <Erro mensagem={erro} />
      {ok && (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {ok === "acao" ? "Ação criada no plano de ação desta reunião." : "Reunião salva."}
        </p>
      )}

      <form action={salvarReuniao} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-2">
        <input type="hidden" name="id" value={rid} />
        <input type="hidden" name="gestao" value={id} />
        <label>
          Data
          <input name="data" type="date" required defaultValue={r.held_on} className="input mt-1" />
        </label>
        <label>
          Tipo
          <select name="tipo" className="input mt-1" defaultValue={r.kind}>
            {Object.entries(TIPOS_REUNIAO).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          Pauta
          <textarea name="pauta" rows={2} defaultValue={r.agenda ?? ""} className="input mt-1" />
        </label>
        <label className="sm:col-span-2">
          Ata
          <textarea name="ata" rows={8} defaultValue={r.minutes ?? ""} className="input mt-1" placeholder="Assuntos tratados, deliberações, responsáveis e prazos." />
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="font-medium">Presença</legend>
          <div className="mt-1 grid gap-1 sm:grid-cols-2">
            {membros.map((x) => (
              <label key={x.id} className="flex items-center gap-2">
                <input type="checkbox" name="presente" value={x.id} defaultChecked={presentes.has(x.id)} />
                {x.workers?.full_name ?? "—"} <span className="text-slate-500">({CARGOS_CIPA[x.role]})</span>
              </label>
            ))}
            {!membros.length && <span className="text-slate-500">Cadastre os membros da gestão primeiro.</span>}
          </div>
        </fieldset>
        <div className="sm:col-span-2">
          <button className="btn">Salvar reunião</button>
        </div>
      </form>

      <h2 className="mt-8 font-semibold">Ações desta reunião</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
        {(acoes ?? []).map((a) => (
          <li key={a.id} className="px-4 py-3">
            <Link href={`/app/acoes/plano/${r.plan_id}`} className="font-medium text-emerald-800 underline">
              #{String(a.number).padStart(4, "0")}
            </Link>{" "}
            {a.action}
            <div className="text-slate-500">
              {a.problem} · prazo {dataBR(a.due_date)} · {STATUS_ACAO[a.status]}
            </div>
          </li>
        ))}
        {!acoes?.length && <li className="px-4 py-6 text-center text-slate-500">Nenhuma ação ainda.</li>}
      </ul>
      <form action={criarAcaoReuniao} className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-2">
        <input type="hidden" name="id" value={rid} />
        <input type="hidden" name="gestao" value={id} />
        <label className="sm:col-span-2">
          Problema apontado
          <input name="problema" required className="input mt-1" />
        </label>
        <label className="sm:col-span-2">
          Ação deliberada
          <input name="acao" required className="input mt-1" />
        </label>
        <label>
          Responsável
          <select name="responsavel" className="input mt-1" defaultValue="">
            <option value="">—</option>
            {(trabalhadores ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
        </label>
        <label>
          Prazo
          <input name="prazo" type="date" defaultValue={somarDias(hoje(), 30)} className="input mt-1" />
        </label>
        <div className="sm:col-span-2">
          <button className="btn">Criar ação</button>
        </div>
      </form>

      <form action={excluirReuniao} className="mt-8">
        <input type="hidden" name="id" value={rid} />
        <input type="hidden" name="gestao" value={id} />
        <button className="text-sm text-red-700 underline">Excluir esta reunião</button>
      </form>
    </div>
  );
}
