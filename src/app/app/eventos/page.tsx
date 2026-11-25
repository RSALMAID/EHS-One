import Link from "next/link";
import { Erro } from "@/components/Erro";
import { FormRelato } from "@/components/FormRelato";
import { numeroEvento, STATUS_EVENTO, TIPOS_EVENTO } from "@/lib/eventos";
import { requireOrg } from "@/lib/org";
import { NivelBadge } from "@/lib/risco";
import { opcoesSetor } from "@/lib/setores";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ erro?: string; grupo?: string; status?: string }> };

type Linha = {
  id: string;
  number: number;
  kind: string;
  status: string;
  occurred_at: string;
  description: string;
  potential_level: number | null;
  sectors: { name: string } | null;
};

export default async function EventosPage({ searchParams }: Props) {
  const { erro, grupo = "todos", status = "abertos" } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  let consulta = supabase
    .from("events")
    .select("id, number, kind, status, occurred_at, description, potential_level, sectors(name)")
    .eq("organization_id", org.id)
    .order("occurred_at", { ascending: false })
    .limit(200);
  if (status === "abertos") consulta = consulta.in("status", ["relatado", "em_analise", "em_investigacao"]);
  const tiposDoGrupo = Object.entries(TIPOS_EVENTO)
    .filter(([, t]) => grupo === "todos" || t.grupo === grupo)
    .map(([k]) => k);
  consulta = consulta.in("kind", tiposDoGrupo);
  const [{ data }, setores] = await Promise.all([consulta, opcoesSetor(org.id)]);
  const eventos = (data ?? []) as unknown as Linha[];
  const filtro = (g: string, s: string) => `/app/eventos?grupo=${g}&status=${s}`;
  const chip = (ativo: boolean) =>
    `rounded-full border px-3 py-1 ${ativo ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-slate-300"}`;

  return (
    <div>
      <h1 className="text-2xl font-bold">Eventos e desvios</h1>
      <p className="mt-1 text-sm text-slate-600">
        Acidentes, incidentes, quase acidentes, eventos ambientais e desvios. Os trabalhadores relatam pelo Meu EHS; aqui
        a equipe classifica, investiga e abre as ações.
      </p>
      <Erro mensagem={erro} />

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {[["todos", "Todos"], ["evento", "Eventos"], ["desvio", "Desvios"]].map(([g, l]) => (
          <Link key={g} href={filtro(g, status)} className={chip(g === grupo)}>{l}</Link>
        ))}
        <span className="mx-1 text-slate-300">|</span>
        {[["abertos", "Em aberto"], ["todos", "Todos"]].map(([s, l]) => (
          <Link key={s} href={filtro(grupo, s)} className={chip(s === status)}>{l}</Link>
        ))}
      </div>

      <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {eventos.map((e) => (
          <li key={e.id} className="px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link href={`/app/eventos/${e.id}`} className="font-medium text-emerald-800 underline">
                {numeroEvento(e.number)} · {TIPOS_EVENTO[e.kind].nome}
              </Link>
              <span className="text-xs text-slate-500">
                {new Date(e.occurred_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} ·{" "}
                {STATUS_EVENTO[e.status]}
              </span>
            </div>
            <p className="text-slate-600">
              {e.sectors ? `${e.sectors.name} · ` : ""}
              {e.description.slice(0, 140)}
            </p>
            {e.potential_level && (
              <p className="mt-1">
                Potencial: <NivelBadge nivel={e.potential_level} />
              </p>
            )}
          </li>
        ))}
        {!eventos.length && <li className="px-4 py-6 text-center text-slate-500">Nenhum registro neste filtro.</li>}
      </ul>

      <h2 className="mt-8 text-lg font-semibold">Registrar</h2>
      <div className="mt-2">
        <FormRelato
          tipos={Object.entries(TIPOS_EVENTO).map(([k, t]) => [k, t.nome])}
          setores={setores}
          voltar="/app/eventos"
        />
      </div>
    </div>
  );
}
