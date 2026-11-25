import Link from "next/link";
import { Erro } from "@/components/Erro";
import { calcularPendencias, dataBR, diasAte, hoje, situacaoCA, somarDias, type Entrega, type Item, type Trabalhador } from "@/lib/epi";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { criarAcaoEpi } from "../actions";

type Props = { searchParams: Promise<{ erro?: string }> };

function BotaoAcao({ item, problema, acao }: { item: string; problema: string; acao: string }) {
  return (
    <form action={criarAcaoEpi}>
      <input type="hidden" name="item" value={item} />
      <input type="hidden" name="problema" value={problema} />
      <input type="hidden" name="acao" value={acao} />
      <input type="hidden" name="prazo" value={somarDias(hoje(), 7)} />
      <button className="text-xs text-emerald-700 hover:underline">Criar ação</button>
    </form>
  );
}

export default async function PendenciasPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: itens }, { data: obrigatorios }, { data: entregas }, { data: trabalhadores }] = await Promise.all([
    supabase
      .from("ppe_items")
      .select("id, name, ca_number, ca_valid_until, stock, replacement_days, active")
      .eq("organization_id", org.id),
    supabase.from("ppe_job_roles").select("ppe_item_id, job_role_id").eq("organization_id", org.id),
    supabase.from("ppe_deliveries").select("ppe_item_id, worker_id, delivered_on").eq("organization_id", org.id),
    supabase
      .from("workers")
      .select("id, full_name, job_role_id")
      .eq("organization_id", org.id)
      .eq("active", true)
      .order("full_name"),
  ]);
  const lista = (itens ?? []) as Item[];
  const pend = calcularPendencias((trabalhadores ?? []) as Trabalhador[], lista, obrigatorios ?? [], (entregas ?? []) as Entrega[]);
  const faltas = pend.filter((p) => p.tipo === "falta");
  const trocas = pend.filter((p) => p.tipo === "troca").sort((a, b) => (a.vence! < b.vence! ? -1 : 1));
  const caAlerta = lista.filter((i) => i.active && i.ca_valid_until && diasAte(i.ca_valid_until) <= 30);
  const semEstoque = lista.filter((i) => i.active && i.stock === 0);
  const entregar = (t: string, i: string) => `/app/epi/entregas?trabalhador=${t}&item=${i}`;

  return (
    <div>
      <Link href="/app/epi" className="text-sm text-emerald-700 underline">← EPI</Link>
      <h1 className="mt-3 text-2xl font-bold">Pendências de EPI</h1>
      <Erro mensagem={erro} />

      <h2 className="mt-6 text-lg font-semibold">Sem EPI obrigatório do cargo ({faltas.length})</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {faltas.map((p) => (
          <li key={p.trabalhador.id + p.item.id} className="flex items-center justify-between gap-3 px-4 py-2">
            <span>
              <strong>{p.trabalhador.full_name}</strong> nunca recebeu <strong>{p.item.name}</strong>
            </span>
            <span className="flex gap-3">
              <Link href={entregar(p.trabalhador.id, p.item.id)} className="text-xs text-emerald-700 hover:underline">Entregar</Link>
              <BotaoAcao
                item={p.item.id}
                problema={`${p.trabalhador.full_name} sem ${p.item.name} (EPI obrigatório do cargo)`}
                acao={`Entregar ${p.item.name} e registrar na ficha de EPI`}
              />
            </span>
          </li>
        ))}
        {!faltas.length && <li className="px-4 py-4 text-center text-slate-500">Nenhuma. Para isto funcionar, marque os cargos em cada EPI.</li>}
      </ul>

      <h2 className="mt-6 text-lg font-semibold">Troca vencida ou nos próximos 15 dias ({trocas.length})</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {trocas.map((p) => {
          const dias = diasAte(p.vence!);
          return (
            <li key={p.trabalhador.id + p.item.id} className="flex items-center justify-between gap-3 px-4 py-2">
              <span>
                <strong>{p.trabalhador.full_name}</strong> · {p.item.name} ·{" "}
                <span className={dias < 0 ? "font-semibold text-red-700" : "text-amber-700"}>
                  {dias < 0 ? `troca vencida desde ${dataBR(p.vence!)}` : `trocar até ${dataBR(p.vence!)}`}
                </span>
              </span>
              <Link href={entregar(p.trabalhador.id, p.item.id)} className="text-xs text-emerald-700 hover:underline">Entregar</Link>
            </li>
          );
        })}
        {!trocas.length && <li className="px-4 py-4 text-center text-slate-500">Nenhuma.</li>}
      </ul>

      <h2 className="mt-6 text-lg font-semibold">CA vencido ou vencendo em 30 dias ({caAlerta.length})</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {caAlerta.map((i) => {
          const ca = situacaoCA(i.ca_valid_until);
          return (
            <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-2">
              <span>
                <Link href={`/app/epi/${i.id}`} className="underline">{i.name}</Link> · CA {i.ca_number ?? "—"} ·{" "}
                <span className={ca.classe}>{ca.texto}</span>
              </span>
              <BotaoAcao
                item={i.id}
                problema={`${i.name}: ${ca.texto} (CA ${i.ca_number ?? "sem número"})`}
                acao="Comprar EPI com CA válido ou atualizar o CA no cadastro"
              />
            </li>
          );
        })}
        {!caAlerta.length && <li className="px-4 py-4 text-center text-slate-500">Nenhum.</li>}
      </ul>

      <h2 className="mt-6 text-lg font-semibold">Sem estoque ({semEstoque.length})</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {semEstoque.map((i) => (
          <li key={i.id} className="px-4 py-2">
            <Link href={`/app/epi/${i.id}`} className="underline">{i.name}</Link>
          </li>
        ))}
        {!semEstoque.length && <li className="px-4 py-4 text-center text-slate-500">Nenhum.</li>}
      </ul>
    </div>
  );
}
