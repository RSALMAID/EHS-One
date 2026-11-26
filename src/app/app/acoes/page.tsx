import Link from "next/link";
import { Erro } from "@/components/Erro";
import { encerrada, numero, ORIGENS, STATUS_PLANO } from "@/lib/acoes";
import { dataBR, hoje } from "@/lib/datas";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { criarPlano } from "./actions";

type Props = { searchParams: Promise<{ erro?: string; ver?: string }> };

type Plano = {
  id: string;
  number: number;
  title: string;
  origin: string;
  due_date: string | null;
  status: string;
  workers: { full_name: string } | null;
  actions: { status: string; due_date: string | null }[];
};

export default async function PlanosPage({ searchParams }: Props) {
  const { erro, ver } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const todos = ver === "todos";
  let consulta = supabase
    .from("action_plans")
    .select("id, number, title, origin, due_date, status, workers(full_name), actions(status, due_date)")
    .eq("organization_id", org.id)
    .order("number", { ascending: false });
  if (!todos) consulta = consulta.in("status", ["aberto", "em_andamento"]);
  const [{ data }, { data: trabalhadores }] = await Promise.all([
    consulta,
    supabase.from("workers").select("id, full_name").eq("organization_id", org.id).eq("active", true).order("full_name"),
  ]);
  const planos = (data ?? []) as unknown as Plano[];
  const h = hoje();

  return (
    <div>
      <h1 className="titulo">Plano de ação</h1>
      <p className="mt-1 text-sm text-slate-600">
        Cada plano reúne as ações de um assunto. As ações criadas no PGR, EPI, treinamentos, saúde e inspeções entram
        sozinhas no plano da sua origem.
      </p>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <Link href="/app/acoes/todas" className="btn-ghost">Todas as ações</Link>
        <Link href={todos ? "/app/acoes" : "/app/acoes?ver=todos"} className="btn-ghost">
          {todos ? "Só planos abertos" : "Ver também encerrados"}
        </Link>
      </div>
      <Erro mensagem={erro} />

      <form action={criarPlano} className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:grid-cols-2">
        <p className="font-semibold sm:col-span-2">Novo plano</p>
        <label className="text-sm">
          Título
          <input name="titulo" required className="input mt-1" placeholder="Adequação NR-12 da prensa" />
        </label>
        <label className="text-sm">
          Origem
          <select name="origem" defaultValue="outro" className="input mt-1">
            {Object.entries(ORIGENS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          Objetivo (opcional)
          <input name="objetivo" className="input mt-1" />
        </label>
        <label className="text-sm">
          Dono do plano
          <select name="dono" className="input mt-1">
            <option value="">—</option>
            {(trabalhadores ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Prazo final
          <input name="prazo" type="date" className="input mt-1" />
        </label>
        <div className="sm:col-span-2">
          <button className="btn">Criar plano</button>
        </div>
      </form>

      <ul className="mt-6 space-y-2">
        {planos.map((p) => {
          const total = p.actions.length;
          const feitas = p.actions.filter((a) => encerrada(a.status)).length;
          const atrasadas = p.actions.filter((a) => !encerrada(a.status) && a.due_date && a.due_date < h).length;
          const pct = total ? Math.round((feitas / total) * 100) : 0;
          return (
            <li key={p.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/app/acoes/plano/${p.id}`} className="font-medium text-emerald-800 underline">
                  Plano {numero(p.number)} · {p.title}
                </Link>
                <span className="text-xs text-slate-500">
                  {ORIGENS[p.origin]} · {STATUS_PLANO[p.status]}
                  {p.due_date ? ` · até ${dataBR(p.due_date)}` : ""}
                </span>
              </div>
              <div className="mt-2 h-2 rounded bg-slate-100">
                <div className="h-2 rounded bg-emerald-600" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {feitas} de {total} ações encerradas
                {atrasadas ? <span className="text-red-700"> · {atrasadas} atrasada(s)</span> : ""}
                {p.workers ? ` · dono: ${p.workers.full_name}` : ""}
              </p>
            </li>
          );
        })}
        {!planos.length && (
          <li className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Nenhum plano aberto.
          </li>
        )}
      </ul>
    </div>
  );
}
