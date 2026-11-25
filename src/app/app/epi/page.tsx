import Link from "next/link";
import { Erro } from "@/components/Erro";
import { calcularPendencias, situacaoCA, type Entrega, type Item, type Trabalhador } from "@/lib/epi";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { adicionarItem } from "./actions";

type Props = { searchParams: Promise<{ erro?: string }> };

export default async function EpiPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: itens }, { data: obrigatorios }, { data: entregas }, { data: trabalhadores }, { data: cargos }] =
    await Promise.all([
      supabase
        .from("ppe_items")
        .select("id, name, ca_number, ca_valid_until, manufacturer, stock, replacement_days, active")
        .eq("organization_id", org.id)
        .order("active", { ascending: false })
        .order("name"),
      supabase.from("ppe_job_roles").select("ppe_item_id, job_role_id").eq("organization_id", org.id),
      supabase.from("ppe_deliveries").select("ppe_item_id, worker_id, delivered_on").eq("organization_id", org.id),
      supabase.from("workers").select("id, full_name, job_role_id").eq("organization_id", org.id).eq("active", true),
      supabase.from("job_roles").select("id, name").eq("organization_id", org.id),
    ]);
  const lista = (itens ?? []) as (Item & { manufacturer: string | null })[];
  const pendencias = calcularPendencias(
    (trabalhadores ?? []) as Trabalhador[],
    lista,
    obrigatorios ?? [],
    (entregas ?? []) as Entrega[],
  );
  const caVencidos = lista.filter((i) => i.active && i.ca_valid_until && situacaoCA(i.ca_valid_until).classe.includes("red")).length;
  const cargosDo = (id: string) =>
    (obrigatorios ?? [])
      .filter((o) => o.ppe_item_id === id)
      .map((o) => cargos?.find((c) => c.id === o.job_role_id)?.name)
      .filter(Boolean)
      .join(", ");

  return (
    <div>
      <h1 className="text-2xl font-bold">EPI</h1>
      <p className="mt-1 text-sm text-slate-600">
        Cadastre os EPIs com CA, diga quais cargos precisam de cada um e registre as entregas com assinatura.
      </p>
      <Erro mensagem={erro} />

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Link href="/app/epi/entregas" className="rounded-lg border border-slate-200 bg-white p-4 hover:border-emerald-600">
          <p className="font-semibold">Registrar entrega</p>
          <p className="text-sm text-slate-600">Ficha de EPI com assinatura do trabalhador</p>
        </Link>
        <Link href="/app/epi/pendencias" className="rounded-lg border border-slate-200 bg-white p-4 hover:border-emerald-600">
          <p className="font-semibold">Pendências</p>
          <p className={`text-sm ${pendencias.length ? "text-amber-700" : "text-slate-600"}`}>
            {pendencias.filter((p) => p.tipo === "falta").length} sem EPI obrigatório ·{" "}
            {pendencias.filter((p) => p.tipo === "troca").length} trocas a fazer
          </p>
        </Link>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="font-semibold">CA vencido</p>
          <p className={`text-sm ${caVencidos ? "text-red-700" : "text-slate-600"}`}>{caVencidos} EPI(s) em uso</p>
        </div>
      </div>

      <form action={adicionarItem} className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <label className="text-sm sm:col-span-2">
          EPI
          <input name="nome" required className="input mt-1" placeholder="Luva de vaqueta" />
        </label>
        <label className="text-sm">
          Fabricante
          <input name="fabricante" className="input mt-1" />
        </label>
        <label className="text-sm">
          Nº do CA
          <input name="ca" className="input mt-1" placeholder="12345" />
        </label>
        <label className="text-sm">
          Validade do CA
          <input name="validade" type="date" className="input mt-1" />
        </label>
        <label className="text-sm">
          Trocar a cada (dias)
          <input name="troca" type="number" min={1} className="input mt-1" placeholder="90" />
        </label>
        <label className="text-sm">
          Estoque inicial
          <input name="estoque" type="number" min={0} defaultValue={0} className="input mt-1" />
        </label>
        <div className="flex items-end sm:col-span-2">
          <button className="btn">Adicionar EPI</button>
        </div>
      </form>

      <ul className="mt-6 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {lista.map((i) => {
          const ca = situacaoCA(i.ca_valid_until);
          return (
            <li key={i.id} className={`px-4 py-3 text-sm ${i.active ? "" : "opacity-50"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/app/epi/${i.id}`} className="font-medium text-emerald-800 underline">
                  {i.name}
                </Link>
                <span className={i.stock === 0 ? "font-semibold text-red-700" : "text-slate-600"}>
                  Estoque: {i.stock}
                </span>
              </div>
              <p className="text-slate-600">
                {i.ca_number ? `CA ${i.ca_number}` : "sem CA"} · <span className={ca.classe}>{ca.texto}</span>
                {i.replacement_days ? ` · troca a cada ${i.replacement_days} dias` : ""}
                {!i.active && " · fora de uso"}
              </p>
              <p className="text-slate-500">Obrigatório para: {cargosDo(i.id) || "nenhum cargo ainda"}</p>
            </li>
          );
        })}
        {!lista.length && <li className="px-4 py-6 text-center text-sm text-slate-500">Nenhum EPI cadastrado.</li>}
      </ul>
    </div>
  );
}
