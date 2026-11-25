import Link from "next/link";
import { NovaPt } from "@/components/apr/Formularios";
import { Erro } from "@/components/Erro";
import { dataHora, numeroPt, STATUS_PT, TIPOS_PT } from "@/lib/apr";
import { requireOrg } from "@/lib/org";
import { opcoesSetor } from "@/lib/setores";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ erro?: string; status?: string }> };

export default async function PtsPage({ searchParams }: Props) {
  const { erro, status = "abertas" } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  let consulta = supabase
    .from("work_permits")
    .select("id, number, kind, status, description, valid_from, valid_until, sectors(name)")
    .eq("organization_id", org.id)
    .order("number", { ascending: false })
    .limit(200);
  if (status === "abertas") consulta = consulta.in("status", ["solicitada", "liberada"]);
  const [{ data }, setores, { data: aprs }] = await Promise.all([
    consulta,
    opcoesSetor(org.id),
    supabase.from("aprs").select("id, number, title").eq("organization_id", org.id).eq("status", "aprovada").order("number", { ascending: false }),
  ]);
  const pts = (data ?? []) as unknown as {
    id: string;
    number: number;
    kind: string;
    status: string;
    description: string;
    valid_from: string;
    valid_until: string;
    sectors: { name: string } | null;
  }[];
  const agora = new Date();
  const chip = (ativo: boolean) =>
    `rounded-full border px-3 py-1 ${ativo ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-slate-300"}`;

  return (
    <div>
      <h1 className="text-2xl font-bold">Permissão de trabalho</h1>
      <p className="mt-1 text-sm text-slate-600">
        PT para serviços de alto risco (altura, espaço confinado, a quente, eletricidade, escavação, içamento). O
        checklist sai pronto conforme o tipo; a equipe libera depois que todos assinam.
      </p>
      <Erro mensagem={erro} />

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-emerald-800">+ Nova PT</summary>
        <div className="mt-2">
          <NovaPt setores={setores} aprs={aprs ?? []} voltar="/app/pt" />
        </div>
      </details>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {[["abertas", "Solicitadas e liberadas"], ["todas", "Todas"]].map(([s, l]) => (
          <Link key={s} href={`/app/pt?status=${s}`} className={chip(s === status)}>{l}</Link>
        ))}
      </div>
      <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {pts.map((p) => {
          const vencida = p.status === "liberada" && new Date(p.valid_until) < agora;
          return (
            <li key={p.id} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/app/pt/${p.id}`} className="font-medium text-emerald-800 underline">
                  {numeroPt(p.number)} · {TIPOS_PT[p.kind]?.nome}
                </Link>
                <span className={`text-xs ${vencida ? "font-semibold text-red-700" : "text-slate-500"}`}>
                  {vencida ? "Prazo vencido: encerre a PT" : STATUS_PT[p.status]}
                </span>
              </div>
              <p className="text-slate-600">
                {p.description} · {dataHora(p.valid_from)} até {dataHora(p.valid_until)}
                {p.sectors ? ` · ${p.sectors.name}` : ""}
              </p>
            </li>
          );
        })}
        {!pts.length && <li className="px-4 py-6 text-center text-slate-500">Nenhuma PT aqui.</li>}
      </ul>
    </div>
  );
}
