import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { classificar, TIPOS_RISCO } from "@/lib/risco";
import { createClient } from "@/lib/supabase/server";
import { BotaoImprimir } from "./BotaoImprimir";

type Linha = {
  id: string;
  risk_type: string;
  hazard: string;
  source: string | null;
  possible_harm: string | null;
  severity: number;
  probability: number;
  level: number;
  existing_controls: string | null;
  residual_severity: number | null;
  residual_probability: number | null;
  validated_at: string | null;
  activities: { name: string; processes: { name: string; sectors: { name: string; units: { name: string } } } };
};

export default async function InventarioPage() {
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data }, { data: vinculos }, { data: cargos }] = await Promise.all([
    supabase
      .from("risks")
      .select("id, risk_type, hazard, source, possible_harm, severity, probability, level, existing_controls, residual_severity, residual_probability, validated_at, activities(name, processes(name, sectors(name, units(name))))")
      .eq("organization_id", org.id)
      .order("level", { ascending: false }),
    supabase.from("risk_job_roles").select("risk_id, job_role_id").eq("organization_id", org.id),
    supabase.from("job_roles").select("id, name").eq("organization_id", org.id),
  ]);
  const linhas = (data ?? []) as unknown as Linha[];
  const expostos = (rid: string) =>
    (vinculos ?? [])
      .filter((v) => v.risk_id === rid)
      .map((v) => cargos?.find((c) => c.id === v.job_role_id)?.name)
      .filter(Boolean)
      .join(", ");

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href="/app/pgr" className="text-sm text-emerald-700 underline">← GRO / PGR</Link>
        <BotaoImprimir />
      </div>
      <h1 className="mt-3 text-2xl font-bold">Inventário de Riscos</h1>
      <p className="text-sm text-slate-600">
        {org.name} · gerado em {new Date().toLocaleDateString("pt-BR")} · {linhas.length} riscos ·{" "}
        {linhas.filter((l) => l.validated_at).length} validados
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-100">
              {["Local", "Atividade", "Tipo", "Perigo", "Fonte", "Agravos", "Expostos", "S", "P", "Nível", "Controles", "Residual", "Validado"].map((h) => (
                <th key={h} className="px-2 py-1 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const p = l.activities.processes;
              const residual = l.residual_severity && l.residual_probability ? l.residual_severity * l.residual_probability : null;
              return (
                <tr key={l.id} className="border-b border-slate-200 align-top">
                  <td className="px-2 py-1">{p.sectors.units.name} › {p.sectors.name} › {p.name}</td>
                  <td className="px-2 py-1">{l.activities.name}</td>
                  <td className="px-2 py-1">{TIPOS_RISCO[l.risk_type]}</td>
                  <td className="px-2 py-1">{l.hazard}</td>
                  <td className="px-2 py-1">{l.source ?? ""}</td>
                  <td className="px-2 py-1">{l.possible_harm ?? ""}</td>
                  <td className="px-2 py-1">{expostos(l.id)}</td>
                  <td className="px-2 py-1">{l.severity}</td>
                  <td className="px-2 py-1">{l.probability}</td>
                  <td className="px-2 py-1">{classificar(l.level).nome} ({l.level})</td>
                  <td className="px-2 py-1">{l.existing_controls ?? ""}</td>
                  <td className="px-2 py-1">{residual ? `${classificar(residual).nome} (${residual})` : ""}</td>
                  <td className="px-2 py-1">{l.validated_at ? new Date(l.validated_at).toLocaleDateString("pt-BR") : "Pendente"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Matriz 5×5 (nível = severidade × probabilidade): Baixo 1–4, Moderado 5–9, Alto 10–16, Crítico 17–25.
      </p>
    </div>
  );
}
