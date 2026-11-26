import Link from "next/link";
import { notFound } from "next/navigation";
import { Erro } from "@/components/Erro";
import { CARGOS_CIPA, estabilidadeAte, REPRESENTACAO, TIPOS_REUNIAO } from "@/lib/cipa";
import { dataBR, hoje } from "@/lib/datas";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { adicionarMembro, criarReuniao, excluirGestao, removerMembro, salvarGestao, salvarMembro } from "../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> };

type Membro = {
  id: string;
  role: string;
  representation: string;
  trained_on: string | null;
  left_on: string | null;
  workers: { full_name: string } | null;
};

const ORDEM = Object.keys(CARGOS_CIPA);

export default async function GestaoPage({ params, searchParams }: Props) {
  const [{ id }, { erro }] = await Promise.all([params, searchParams]);
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: g }, { data: m }, { data: reunioes }, { data: trabalhadores }, { data: unidades }] = await Promise.all([
    supabase.from("cipa_mandates").select("*").eq("id", id).maybeSingle(),
    supabase.from("cipa_members").select("id, role, representation, trained_on, left_on, workers(full_name)").eq("mandate_id", id),
    supabase
      .from("cipa_meetings")
      .select("id, held_on, kind, minutes, cipa_attendances(member_id)")
      .eq("mandate_id", id)
      .order("held_on", { ascending: false }),
    supabase.from("workers").select("id, full_name").eq("organization_id", org.id).eq("active", true).order("full_name"),
    supabase.from("units").select("id, name").eq("organization_id", org.id).order("name"),
  ]);
  if (!g) notFound();
  const membros = ((m ?? []) as unknown as Membro[]).sort(
    (a, b) =>
      a.representation.localeCompare(b.representation) ||
      ORDEM.indexOf(a.role) - ORDEM.indexOf(b.role) ||
      (a.workers?.full_name ?? "").localeCompare(b.workers?.full_name ?? ""),
  );
  const ativos = membros.filter((x) => !x.left_on);
  const semTreino = ativos.filter((x) => !x.trained_on).length;
  const h = hoje();

  return (
    <div>
      <Link href="/app/cipa" className="text-sm text-emerald-700 underline">← CIPA</Link>
      <h1 className="mt-3 text-xl font-bold">{g.name}</h1>
      <p className="text-sm text-slate-600">
        Mandato de {dataBR(g.starts_on)} a {dataBR(g.ends_on)}
        {g.election_on ? ` · eleição em ${dataBR(g.election_on)}` : ""}
      </p>
      <Erro mensagem={erro} />
      {semTreino > 0 && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {semTreino} membro(s) sem data do treinamento da CIPA. A NR-05 exige o treinamento antes da posse.
        </p>
      )}

      <h2 className="mt-6 font-semibold">Membros</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse rounded-lg bg-white text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Representação</th>
              <th className="px-3 py-2">Cargo</th>
              <th className="px-3 py-2">Treinamento</th>
              <th className="px-3 py-2">Saiu em</th>
              <th className="px-3 py-2">Estabilidade até</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {membros.map((x) => {
              const estab = estabilidadeAte(x.representation, g.ends_on);
              const form = `membro-${x.id}`;
              return (
                <tr key={x.id} className={`border-b border-slate-100 ${x.left_on ? "text-slate-400" : ""}`}>
                  <td className="px-3 py-2">{x.workers?.full_name ?? "—"}</td>
                  <td className="px-3 py-2">{REPRESENTACAO[x.representation]}</td>
                  <td className="px-3 py-2">
                    <select name="cargo" form={form} defaultValue={x.role} className="input">
                      {Object.entries(CARGOS_CIPA).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input name="treinamento" type="date" form={form} defaultValue={x.trained_on ?? ""} className="input" />
                  </td>
                  <td className="px-3 py-2">
                    <input name="saida" type="date" form={form} defaultValue={x.left_on ?? ""} className="input" />
                  </td>
                  <td className="px-3 py-2">{estab ? (estab >= h ? dataBR(estab) : `${dataBR(estab)} (encerrada)`) : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <form id={form} action={salvarMembro} className="inline">
                      <input type="hidden" name="id" value={x.id} />
                      <input type="hidden" name="gestao" value={id} />
                      <button className="text-emerald-700 underline">salvar</button>
                    </form>
                    <form action={removerMembro} className="ml-2 inline">
                      <input type="hidden" name="id" value={x.id} />
                      <input type="hidden" name="gestao" value={id} />
                      <button className="text-red-700 underline">remover</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {!membros.length && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">Nenhum membro ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Estabilidade: o representante eleito pelos empregados (titular ou suplente) não pode ser dispensado sem justa causa
        desde o registro da candidatura até 1 ano após o fim do mandato.
      </p>

      <form action={adicionarMembro} className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-4 sm:items-end">
        <input type="hidden" name="gestao" value={id} />
        <label>
          Pessoa
          <select name="trabalhador" required className="input mt-1" defaultValue="">
            <option value="" disabled>Escolha…</option>
            {(trabalhadores ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
        </label>
        <label>
          Representação
          <select name="representacao" required className="input mt-1" defaultValue="">
            <option value="" disabled>Escolha…</option>
            {Object.entries(REPRESENTACAO).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Cargo
          <select name="cargo" className="input mt-1" defaultValue="titular">
            {Object.entries(CARGOS_CIPA).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Treinamento em
          <input name="treinamento" type="date" className="input mt-1" />
        </label>
        <div className="sm:col-span-4">
          <button className="btn">Adicionar membro</button>
        </div>
      </form>

      <h2 className="mt-8 font-semibold">Reuniões</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
        {(reunioes ?? []).map((r) => (
          <li key={r.id} className="px-4 py-3">
            <Link href={`/app/cipa/${id}/reuniao/${r.id}`} className="font-medium text-emerald-800 underline">
              {dataBR(r.held_on)} · {TIPOS_REUNIAO[r.kind]}
            </Link>
            <span className="text-slate-500">
              {" "}· {(r.cipa_attendances as unknown[]).length} presente(s) · {r.minutes ? "ata registrada" : "sem ata"}
            </span>
          </li>
        ))}
        {!reunioes?.length && <li className="px-4 py-6 text-center text-slate-500">Nenhuma reunião registrada.</li>}
      </ul>
      <form action={criarReuniao} className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-4 sm:items-end">
        <input type="hidden" name="gestao" value={id} />
        <label>
          Data
          <input name="data" type="date" required defaultValue={h} className="input mt-1" />
        </label>
        <label>
          Tipo
          <select name="tipo" className="input mt-1" defaultValue="ordinaria">
            {Object.entries(TIPOS_REUNIAO).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          Pauta
          <input name="pauta" className="input mt-1" />
        </label>
        <div className="sm:col-span-4">
          <button className="btn">Registrar reunião</button>
          <span className="ml-3 text-xs text-slate-500">As reuniões ordinárias são mensais, conforme o calendário anual.</span>
        </div>
      </form>

      <details className="mt-8">
        <summary className="cursor-pointer text-sm font-medium text-emerald-800">Editar gestão</summary>
        <form action={salvarGestao} className="mt-2 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-2">
          <input type="hidden" name="id" value={id} />
          <label>
            Nome
            <input name="nome" required defaultValue={g.name} className="input mt-1" />
          </label>
          <label>
            Unidade
            <select name="unidade" className="input mt-1" defaultValue={g.unit_id ?? ""}>
              <option value="">—</option>
              {(unidades ?? []).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </label>
          <label>
            Início do mandato
            <input name="inicio" type="date" required defaultValue={g.starts_on} className="input mt-1" />
          </label>
          <label>
            Fim do mandato
            <input name="fim" type="date" required defaultValue={g.ends_on} className="input mt-1" />
          </label>
          <label>
            Data da eleição
            <input name="eleicao" type="date" defaultValue={g.election_on ?? ""} className="input mt-1" />
          </label>
          <label>
            Observações
            <input name="obs" defaultValue={g.notes ?? ""} className="input mt-1" />
          </label>
          <div className="sm:col-span-2">
            <button className="btn">Salvar</button>
          </div>
        </form>
        <form action={excluirGestao} className="mt-3">
          <input type="hidden" name="id" value={id} />
          <button className="text-sm text-red-700 underline">Excluir esta gestão (com membros e reuniões)</button>
        </form>
      </details>
    </div>
  );
}
