import Link from "next/link";
import { Assinatura } from "@/lib/assinatura";
import { notFound } from "next/navigation";
import { Erro } from "@/components/Erro";
import { dataBR, MOTIVOS, situacaoCA } from "@/lib/epi";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { movimentarEstoque, removerItem, salvarCargosObrigatorios, salvarItem } from "../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> };

type EntregaLinha = {
  id: string;
  delivered_on: string;
  quantity: number;
  reason: string;
  ca_number: string | null;
  signature_name: string | null;
  confirmed_at: string | null;
  workers: { id: string; full_name: string } | null;
};

export default async function EpiItemPage({ params, searchParams }: Props) {
  const [{ id }, { erro }] = await Promise.all([params, searchParams]);
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: item }, { data: cargos }, { data: obrigatorios }, { data: entregas }] = await Promise.all([
    supabase
      .from("ppe_items")
      .select("id, name, ca_number, ca_valid_until, manufacturer, stock, replacement_days, active")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("job_roles").select("id, name").eq("organization_id", org.id).order("name"),
    supabase.from("ppe_job_roles").select("job_role_id").eq("ppe_item_id", id),
    supabase
      .from("ppe_deliveries")
      .select("id, delivered_on, quantity, reason, ca_number, signature_name, confirmed_at, workers(id, full_name)")
      .eq("ppe_item_id", id)
      .order("delivered_on", { ascending: false })
      .limit(100),
  ]);
  if (!item) notFound();
  const marcados = new Set((obrigatorios ?? []).map((o) => o.job_role_id));
  const ca = situacaoCA(item.ca_valid_until);
  const linhas = (entregas ?? []) as unknown as EntregaLinha[];

  return (
    <div>
      <Link href="/app/epi" className="text-sm text-emerald-700 underline">← EPI</Link>
      <h1 className="mt-3 text-2xl font-bold">{item.name}</h1>
      <p className="text-sm">
        {item.ca_number ? `CA ${item.ca_number} · ` : ""}
        <span className={ca.classe}>{ca.texto}</span> · estoque {item.stock}
      </p>
      <Erro mensagem={erro} />

      <form action={salvarItem} className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:grid-cols-3">
        <input type="hidden" name="id" value={item.id} />
        <label className="text-sm sm:col-span-2">
          EPI
          <input name="nome" required defaultValue={item.name} className="input mt-1" />
        </label>
        <label className="text-sm">
          Fabricante
          <input name="fabricante" defaultValue={item.manufacturer ?? ""} className="input mt-1" />
        </label>
        <label className="text-sm">
          Nº do CA
          <input name="ca" defaultValue={item.ca_number ?? ""} className="input mt-1" />
        </label>
        <label className="text-sm">
          Validade do CA
          <input name="validade" type="date" defaultValue={item.ca_valid_until ?? ""} className="input mt-1" />
        </label>
        <label className="text-sm">
          Trocar a cada (dias)
          <input name="troca" type="number" min={1} defaultValue={item.replacement_days ?? ""} className="input mt-1" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked={item.active} /> Em uso
        </label>
        <div className="sm:col-span-2">
          <button className="btn">Salvar</button>
        </div>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <form action={movimentarEstoque} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
          <input type="hidden" name="id" value={item.id} />
          <p className="font-semibold">Estoque: {item.stock}</p>
          <p className="text-sm text-slate-600">Compra: número positivo. Acerto para menos: número negativo.</p>
          <div className="mt-2 flex gap-2">
            <input name="quantidade" type="number" required className="input" placeholder="+10" />
            <button className="btn">Lançar</button>
          </div>
        </form>

        <form action={salvarCargosObrigatorios} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
          <input type="hidden" name="id" value={item.id} />
          <p className="font-semibold">Obrigatório para os cargos</p>
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
      </div>

      <h2 className="mt-8 text-lg font-semibold">Entregas deste EPI</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
        {linhas.map((e) => (
          <li key={e.id} className="px-4 py-2">
            {dataBR(e.delivered_on)} ·{" "}
            {e.workers ? (
              <Link href={`/app/epi/ficha/${e.workers.id}`} className="underline">{e.workers.full_name}</Link>
            ) : "—"}{" "}
            · {e.quantity} un. · {MOTIVOS[e.reason] ?? e.reason} · CA {e.ca_number ?? "—"} · <Assinatura e={e} />
          </li>
        ))}
        {!linhas.length && <li className="px-4 py-6 text-center text-slate-500">Nenhuma entrega ainda.</li>}
      </ul>

      <form action={removerItem} className="mt-8">
        <input type="hidden" name="id" value={item.id} />
        <button className="text-xs text-red-600 hover:underline">Excluir este EPI</button>
      </form>
    </div>
  );
}
