import Link from "next/link";
import { Erro } from "@/components/Erro";
import { dataBR, hoje } from "@/lib/datas";
import { numeroDds } from "@/lib/dds";
import { requireOrg } from "@/lib/org";
import { opcoesSetor } from "@/lib/setores";
import { createClient } from "@/lib/supabase/server";
import { criarDds } from "./actions";

type Props = { searchParams: Promise<{ erro?: string }> };

export default async function DdsPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data }, setores] = await Promise.all([
    supabase
      .from("dds_talks")
      .select("id, number, title, held_on, status, facilitator, sectors(name), dds_attendances(confirmed_at)")
      .eq("organization_id", org.id)
      .order("held_on", { ascending: false })
      .limit(100),
    opcoesSetor(org.id),
  ]);
  const lista = (data ?? []) as unknown as {
    id: string;
    number: number;
    title: string;
    held_on: string;
    status: string;
    facilitator: string | null;
    sectors: { name: string } | null;
    dds_attendances: { confirmed_at: string | null }[];
  }[];

  return (
    <div>
      <h1 className="text-2xl font-bold">DDS</h1>
      <p className="mt-1 text-sm text-slate-600">
        Diálogo Diário de Segurança. Registre o tema e quem participou; cada trabalhador confirma a presença no próprio
        celular (Meu EHS), ou você marca aqui. Para ter o registro em papel, imprima a lista.
      </p>
      <Erro mensagem={erro} />

      <form action={criarDds} className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
        <label className="sm:col-span-2">
          Tema
          <input name="titulo" required className="input mt-1" placeholder="Ex.: uso correto do protetor auricular" />
        </label>
        <label className="sm:col-span-2">
          Conteúdo (o que foi falado; aparece no celular dos participantes)
          <textarea name="conteudo" rows={3} className="input mt-1" />
        </label>
        <label>
          Data
          <input name="data" type="date" defaultValue={hoje()} className="input mt-1" />
        </label>
        <label>
          Setor (já inclui o pessoal do setor)
          <select name="setor" className="input mt-1" defaultValue="">
            <option value="">—</option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          Quem conduziu
          <input name="facilitador" className="input mt-1" />
        </label>
        <div className="sm:col-span-2">
          <button className="btn">Registrar DDS</button>
        </div>
      </form>

      <ul className="mt-6 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {lista.map((d) => {
          const ok = d.dds_attendances.filter((a) => a.confirmed_at).length;
          return (
            <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
              <Link href={`/app/dds/${d.id}`} className="font-medium text-emerald-800 underline">
                {numeroDds(d.number)} · {d.title}
              </Link>
              <span className="text-xs text-slate-500">
                {dataBR(d.held_on)}
                {d.sectors ? ` · ${d.sectors.name}` : ""} · {ok}/{d.dds_attendances.length} presenças ·{" "}
                {d.status === "aberto" ? "aberto" : "encerrado"}
              </span>
            </li>
          );
        })}
        {!lista.length && <li className="px-4 py-6 text-center text-slate-500">Nenhum DDS ainda.</li>}
      </ul>
    </div>
  );
}
