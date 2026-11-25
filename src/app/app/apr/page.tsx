import Link from "next/link";
import { NovaApr } from "@/components/apr/Formularios";
import { Erro } from "@/components/Erro";
import { numeroApr, STATUS_APR } from "@/lib/apr";
import { dataBR } from "@/lib/datas";
import { requireOrg } from "@/lib/org";
import { opcoesSetor } from "@/lib/setores";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ erro?: string; status?: string }> };

const FILTROS: [string, string][] = [
  ["pendentes", "Aguardando aprovação"],
  ["abertas", "Em andamento"],
  ["todas", "Todas"],
];

export default async function AprsPage({ searchParams }: Props) {
  const { erro, status = "abertas" } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  let consulta = supabase
    .from("aprs")
    .select("id, number, title, status, planned_on, sectors(name), apr_steps(level)")
    .eq("organization_id", org.id)
    .order("number", { ascending: false })
    .limit(200);
  if (status === "pendentes") consulta = consulta.eq("status", "aguardando_aprovacao");
  if (status === "abertas") consulta = consulta.in("status", ["rascunho", "aguardando_aprovacao", "reprovada", "aprovada"]);
  const [{ data }, setores] = await Promise.all([consulta, opcoesSetor(org.id)]);
  const aprs = (data ?? []) as unknown as {
    id: string;
    number: number;
    title: string;
    status: string;
    planned_on: string;
    sectors: { name: string } | null;
    apr_steps: { level: number }[];
  }[];
  const chip = (ativo: boolean) =>
    `rounded-full border px-3 py-1 ${ativo ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-slate-300"}`;

  return (
    <div>
      <h1 className="text-2xl font-bold">APR digital</h1>
      <p className="mt-1 text-sm text-slate-600">
        Análise Preliminar de Risco: as etapas da tarefa, os perigos de cada uma e como controlar. Os trabalhadores
        também criam APR pelo Meu EHS; a equipe aprova ou devolve, e cada participante assina no celular.
      </p>
      <Erro mensagem={erro} />

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-emerald-800">+ Nova APR</summary>
        <div className="mt-2">
          <NovaApr setores={setores} voltar="/app/apr" />
        </div>
      </details>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {FILTROS.map(([s, l]) => (
          <Link key={s} href={`/app/apr?status=${s}`} className={chip(s === status)}>{l}</Link>
        ))}
      </div>
      <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {aprs.map((a) => {
          const maior = Math.max(0, ...a.apr_steps.map((e) => e.level));
          return (
            <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
              <Link href={`/app/apr/${a.id}`} className="font-medium text-emerald-800 underline">
                {numeroApr(a.number)} · {a.title}
              </Link>
              <span className="text-xs text-slate-500">
                {dataBR(a.planned_on)}
                {a.sectors ? ` · ${a.sectors.name}` : ""} · {a.apr_steps.length} etapa(s)
                {maior ? ` · maior risco ${maior}` : ""} · <strong>{STATUS_APR[a.status]}</strong>
              </span>
            </li>
          );
        })}
        {!aprs.length && <li className="px-4 py-6 text-center text-slate-500">Nenhuma APR aqui.</li>}
      </ul>
    </div>
  );
}
