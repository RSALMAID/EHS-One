import Link from "next/link";
import { AcaoCard, CAMPOS_ACAO, type AcaoLinha } from "@/components/AcaoCard";
import { Erro } from "@/components/Erro";
import { hoje } from "@/lib/datas";
import { evidenciasDe } from "@/lib/evidencias";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ erro?: string; status?: string }> };

const FILTROS: Record<string, string> = {
  abertas: "Em aberto",
  atrasadas: "Atrasadas",
  aguardando_validacao: "Aguardando validação",
  todas: "Todas",
};

export default async function TodasAcoesPage({ searchParams }: Props) {
  const { erro, status = "abertas" } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  let consulta = supabase
    .from("actions")
    .select(`${CAMPOS_ACAO}, action_plans(id, number, title)`)
    .eq("organization_id", org.id)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (status === "abertas") consulta = consulta.in("status", ["aberta", "em_andamento", "aguardando_validacao"]);
  if (status === "atrasadas") consulta = consulta.in("status", ["aberta", "em_andamento"]).lt("due_date", hoje());
  if (status === "aguardando_validacao") consulta = consulta.eq("status", "aguardando_validacao");
  const { data } = await consulta.limit(200);
  const acoes = (data ?? []) as unknown as AcaoLinha[];
  const evidencias = await evidenciasDe(acoes.map((a) => a.id));
  const voltar = `/app/acoes/todas?status=${status}`;

  return (
    <div>
      <Link href="/app/acoes" className="text-sm text-emerald-700 underline">← Planos de ação</Link>
      <h1 className="mt-3 text-2xl font-bold">Todas as ações</h1>
      <Erro mensagem={erro} />
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {Object.entries(FILTROS).map(([v, l]) => (
          <Link
            key={v}
            href={`/app/acoes/todas?status=${v}`}
            className={`rounded-full border px-3 py-1 ${v === status ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-slate-300"}`}
          >
            {l}
          </Link>
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {acoes.map((a) => (
          <AcaoCard key={a.id} a={a} plano voltar={voltar} evidencias={evidencias.filter((e) => e.action_id === a.id)} />
        ))}
        {!acoes.length && (
          <li className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Nenhuma ação neste filtro.
          </li>
        )}
      </ul>
    </div>
  );
}
