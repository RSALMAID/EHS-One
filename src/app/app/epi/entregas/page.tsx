import Link from "next/link";
import { Erro } from "@/components/Erro";
import { dataBR, hoje, MOTIVOS } from "@/lib/epi";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { excluirEntrega, registrarEntrega } from "../actions";

type Props = { searchParams: Promise<{ erro?: string; ok?: string; trabalhador?: string; item?: string }> };

type Linha = {
  id: string;
  delivered_on: string;
  quantity: number;
  reason: string;
  signature_name: string;
  ppe_items: { name: string } | null;
  workers: { id: string; full_name: string } | null;
};

export default async function EntregasPage({ searchParams }: Props) {
  const { erro, ok, trabalhador, item } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: trabalhadores }, { data: itens }, { data: entregas }] = await Promise.all([
    supabase.from("workers").select("id, full_name").eq("organization_id", org.id).eq("active", true).order("full_name"),
    supabase
      .from("ppe_items")
      .select("id, name, ca_number, stock")
      .eq("organization_id", org.id)
      .eq("active", true)
      .order("name"),
    supabase
      .from("ppe_deliveries")
      .select("id, delivered_on, quantity, reason, signature_name, ppe_items(name), workers(id, full_name)")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const linhas = (entregas ?? []) as unknown as Linha[];

  return (
    <div>
      <Link href="/app/epi" className="text-sm text-emerald-700 underline">← EPI</Link>
      <h1 className="mt-3 text-2xl font-bold">Registrar entrega de EPI</h1>
      <p className="mt-1 text-sm text-slate-600">
        Entregue o EPI e peça ao trabalhador para digitar o próprio nome e marcar a declaração. O estoque baixa sozinho.
      </p>
      <Erro mensagem={erro} />
      {ok && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Entrega registrada.</p>}

      <form action={registrarEntrega} className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <label className="text-sm">
          Trabalhador
          <select name="trabalhador" required defaultValue={trabalhador ?? ""} className="input mt-1">
            <option value="">— escolha —</option>
            {(trabalhadores ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          EPI
          <select name="item" required defaultValue={item ?? ""} className="input mt-1">
            <option value="">— escolha —</option>
            {(itens ?? []).map((i) => (
              <option key={i.id} value={i.id} disabled={i.stock === 0}>
                {i.name}{i.ca_number ? ` (CA ${i.ca_number})` : ""} · estoque {i.stock}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Quantidade
          <input name="quantidade" type="number" min={1} defaultValue={1} className="input mt-1" />
        </label>
        <label className="text-sm">
          Data da entrega
          <input name="data" type="date" defaultValue={hoje()} className="input mt-1" />
        </label>
        <label className="text-sm">
          Motivo
          <select name="motivo" className="input mt-1">
            {Object.entries(MOTIVOS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Assinatura: nome completo digitado pelo trabalhador
          <input name="assinatura" required className="input mt-1" />
        </label>
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="declaro" required className="mt-1" />
          Declaro que recebi o EPI acima, gratuitamente, fui orientado sobre o uso correto, guarda e conservação, e
          me comprometo a usá-lo e a comunicar qualquer dano (NR-6).
        </label>
        <div className="sm:col-span-2">
          <button className="btn">Registrar entrega</button>
        </div>
      </form>

      <h2 className="mt-8 text-lg font-semibold">Últimas entregas</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {linhas.map((e) => (
          <li key={e.id} className="flex items-start justify-between gap-3 px-4 py-2">
            <span>
              {dataBR(e.delivered_on)} ·{" "}
              {e.workers ? (
                <Link href={`/app/epi/ficha/${e.workers.id}`} className="underline">{e.workers.full_name}</Link>
              ) : "—"}{" "}
              · {e.ppe_items?.name} · {e.quantity} un. · {MOTIVOS[e.reason] ?? e.reason} · assinado: {e.signature_name}
            </span>
            <form action={excluirEntrega}>
              <input type="hidden" name="id" value={e.id} />
              <button className="text-xs text-red-600 hover:underline" title="Exclui e devolve ao estoque">Excluir</button>
            </form>
          </li>
        ))}
        {!linhas.length && <li className="px-4 py-6 text-center text-slate-500">Nenhuma entrega ainda.</li>}
      </ul>
    </div>
  );
}
