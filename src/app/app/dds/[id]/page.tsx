import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { Erro } from "@/components/Erro";
import { dataHora } from "@/lib/apr";
import { dataBR } from "@/lib/datas";
import { numeroDds } from "@/lib/dds";
import { requireOrg } from "@/lib/org";
import { opcoesSetor } from "@/lib/setores";
import { createClient } from "@/lib/supabase/server";
import { adicionarParticipantes, excluirDds, marcarPresenca, mudarStatusDds, removerParticipante } from "../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> };

export default async function DdsDetalhe({ params, searchParams }: Props) {
  const [{ id }, { erro }] = await Promise.all([params, searchParams]);
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data }, { data: presencas }, { data: trabalhadores }, setores] = await Promise.all([
    supabase.from("dds_talks").select("id, number, title, content, held_on, status, facilitator, sectors(name)").eq("id", id).maybeSingle(),
    supabase
      .from("dds_attendances")
      .select("id, confirmed_at, confirmed_device, workers(full_name, job_roles(name))")
      .eq("talk_id", id),
    supabase.from("workers").select("id, full_name").eq("organization_id", org.id).eq("active", true).order("full_name"),
    opcoesSetor(org.id),
  ]);
  if (!data) notFound();
  const d = data as unknown as {
    id: string;
    number: number;
    title: string;
    content: string | null;
    held_on: string;
    status: string;
    facilitator: string | null;
    sectors: { name: string } | null;
  };
  const lista = ((presencas ?? []) as unknown as {
    id: string;
    confirmed_at: string | null;
    confirmed_device: string | null;
    workers: { full_name: string; job_roles: { name: string } | null } | null;
  }[]).sort((a, b) => (a.workers?.full_name ?? "").localeCompare(b.workers?.full_name ?? ""));
  const aberto = d.status === "aberto";
  const oculto = (
    <>
      <input type="hidden" name="dds" value={d.id} />
    </>
  );

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href="/app/dds" className="text-sm text-emerald-700 underline">← DDS</Link>
        <BotaoImprimir />
      </div>
      <h1 className="mt-3 text-xl font-bold">{numeroDds(d.number)} · {d.title}</h1>
      <p className="text-sm text-slate-600">
        {org.name} · {dataBR(d.held_on)}
        {d.sectors ? ` · ${d.sectors.name}` : ""}
        {d.facilitator ? ` · conduzido por ${d.facilitator}` : ""} · {aberto ? "aberto para confirmação" : "encerrado"}
      </p>
      {d.content && <p className="mt-3 whitespace-pre-line text-sm">{d.content}</p>}
      <Erro mensagem={erro} />

      <h2 className="mt-6 font-semibold">Lista de presença ({lista.filter((p) => p.confirmed_at).length}/{lista.length})</h2>
      <table className="mt-2 w-full border-collapse rounded-lg bg-white text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
            <th className="px-2 py-1">Nome</th>
            <th className="px-2 py-1">Cargo</th>
            <th className="px-2 py-1">Presença</th>
            <th className="hidden px-2 py-1 print:table-cell">Assinatura</th>
            <th className="print:hidden" />
          </tr>
        </thead>
        <tbody>
          {lista.map((p) => (
            <tr key={p.id} className="border-b border-slate-100">
              <td className="px-2 py-1">{p.workers?.full_name}</td>
              <td className="px-2 py-1 text-slate-600">{p.workers?.job_roles?.name ?? "—"}</td>
              <td className="px-2 py-1">
                {p.confirmed_at ? (
                  <span className="text-emerald-700">
                    ✓ {dataHora(p.confirmed_at)}
                    {p.confirmed_device === "marcado pela equipe" ? " (equipe)" : " (celular)"}
                  </span>
                ) : (
                  <span className="text-amber-700">não confirmou</span>
                )}
              </td>
              <td className="hidden w-48 border-b border-slate-400 print:table-cell" />
              <td className="px-2 py-1 text-right print:hidden">
                <span className="inline-flex gap-3">
                  <form action={marcarPresenca}>
                    {oculto}
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="presente" value={p.confirmed_at ? "0" : "1"} />
                    <button className="text-xs text-emerald-700 hover:underline">
                      {p.confirmed_at ? "Desmarcar" : "Marcar presente"}
                    </button>
                  </form>
                  <form action={removerParticipante}>
                    {oculto}
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-xs text-red-600 hover:underline">Retirar</button>
                  </form>
                </span>
              </td>
            </tr>
          ))}
          {!lista.length && (
            <tr>
              <td colSpan={4} className="px-2 py-4 text-center text-slate-500">Ninguém na lista ainda.</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 print:hidden">
        <form action={adicionarParticipantes} className="flex gap-2 text-sm">
          <input type="hidden" name="id" value={d.id} />
          <select name="setor" required className="input" defaultValue="">
            <option value="">Incluir setor inteiro…</option>
            <option value="todos">Todos os trabalhadores ativos</option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <button className="btn-ghost">Incluir</button>
        </form>
        <form action={adicionarParticipantes} className="flex gap-2 text-sm">
          <input type="hidden" name="id" value={d.id} />
          <select name="trabalhador" required className="input" defaultValue="">
            <option value="">Incluir pessoa…</option>
            {(trabalhadores ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
          <button className="btn-ghost">Incluir</button>
        </form>
      </div>

      <div className="mt-8 flex gap-6 print:hidden">
        <form action={mudarStatusDds}>
          <input type="hidden" name="id" value={d.id} />
          <input type="hidden" name="status" value={aberto ? "encerrado" : "aberto"} />
          <button className="btn-ghost">{aberto ? "Encerrar confirmações" : "Reabrir confirmações"}</button>
        </form>
        <form action={excluirDds}>
          <input type="hidden" name="id" value={d.id} />
          <button className="text-xs text-red-600 hover:underline">Excluir DDS</button>
        </form>
      </div>
    </div>
  );
}
