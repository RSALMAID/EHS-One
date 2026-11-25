import { Erro } from "@/components/Erro";
import { dataBR } from "@/lib/datas";
import { numeroDds } from "@/lib/dds";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { confirmarDds } from "../actions";

type Props = { searchParams: Promise<{ erro?: string; ok?: string }> };

export default async function MeuDdsPage({ searchParams }: Props) {
  const { erro, ok } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: abertos }, { data: minhas }] = await Promise.all([
    supabase
      .from("dds_talks")
      .select("id, number, title, content, held_on, facilitator")
      .eq("organization_id", org.id)
      .eq("status", "aberto")
      .order("held_on", { ascending: false })
      .limit(20),
    supabase
      .from("dds_attendances")
      .select("talk_id, confirmed_at, dds_talks(number, title, held_on)")
      .eq("worker_id", org.workerId ?? "")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const presencas = (minhas ?? []) as unknown as {
    talk_id: string;
    confirmed_at: string | null;
    dds_talks: { number: number; title: string; held_on: string } | null;
  }[];
  const confirmado = new Set(presencas.filter((p) => p.confirmed_at).map((p) => p.talk_id));
  const pendentes = (abertos ?? []).filter((d) => !confirmado.has(d.id));

  return (
    <div>
      <h1 className="text-xl font-bold">DDS</h1>
      <p className="mt-1 text-sm text-slate-600">Participou do diálogo de segurança? Confirme aqui a sua presença.</p>
      <Erro mensagem={erro} />
      {ok && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Presença confirmada.</p>}

      <ul className="mt-4 space-y-3">
        {pendentes.map((d) => (
          <li key={d.id} className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
            <p className="font-semibold">{numeroDds(d.number)} · {d.title}</p>
            <p className="text-xs text-slate-600">
              {dataBR(d.held_on)}
              {d.facilitator ? ` · ${d.facilitator}` : ""}
            </p>
            {d.content && <p className="mt-2 whitespace-pre-line">{d.content}</p>}
            <form action={confirmarDds} className="mt-3">
              <input type="hidden" name="id" value={d.id} />
              <button className="btn w-full">Participei deste DDS</button>
            </form>
          </li>
        ))}
        {!pendentes.length && <li className="text-sm text-slate-500">Nenhum DDS esperando a sua confirmação.</li>}
      </ul>

      <h2 className="mt-6 font-semibold">Meus DDS</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {presencas
          .filter((p) => p.confirmed_at)
          .map((p) => (
            <li key={p.talk_id} className="px-4 py-2">
              {p.dds_talks ? `${dataBR(p.dds_talks.held_on)} · ${p.dds_talks.title}` : "—"}
              <span className="text-emerald-700"> ✓</span>
            </li>
          ))}
        {!confirmado.size && <li className="px-4 py-4 text-center text-slate-500">Nenhum ainda.</li>}
      </ul>
    </div>
  );
}
