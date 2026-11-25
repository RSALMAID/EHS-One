import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { classificar, TIPOS_RISCO } from "@/lib/risco";
import { createClient } from "@/lib/supabase/server";
import { BotaoImprimir } from "../inventario/BotaoImprimir";

// Cores convencionais dos mapas de risco por grupo.
const COR_TIPO: Record<string, string> = {
  fisico: "#16a34a", // verde
  quimico: "#dc2626", // vermelho
  biologico: "#92400e", // marrom
  ergonomico: "#eab308", // amarelo
  acidente: "#2563eb", // azul
  psicossocial: "#7c3aed", // roxo
};

// Tamanho do círculo pela classificação da matriz 5×5.
function raio(nivel: number) {
  const c = classificar(nivel).nome;
  return c === "Crítico" ? 22 : c === "Alto" ? 17 : c === "Moderado" ? 12 : 8;
}

type Risco = {
  id: string;
  risk_type: string;
  hazard: string;
  level: number;
  activities: { name: string; processes: { sector_id: string } };
};

export default async function MapaRiscosPage() {
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: unidades }, { data: setores }, { data }] = await Promise.all([
    supabase.from("units").select("id, name").eq("organization_id", org.id).order("name"),
    supabase.from("sectors").select("id, name, unit_id").eq("organization_id", org.id).order("name"),
    supabase
      .from("risks")
      .select("id, risk_type, hazard, level, activities(name, processes(sector_id))")
      .eq("organization_id", org.id)
      .order("level", { ascending: false }),
  ]);
  const riscos = (data ?? []) as unknown as Risco[];
  const doSetor = (sid: string) => riscos.filter((r) => r.activities?.processes?.sector_id === sid);

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href="/app/pgr" className="text-sm text-emerald-700 underline">← GRO / PGR</Link>
        <BotaoImprimir />
      </div>
      <h1 className="mt-3 text-2xl font-bold">Mapa de riscos</h1>
      <p className="text-sm text-slate-600">
        {org.name} · gerado em {new Date().toLocaleDateString("pt-BR")} · a partir do Inventário de Riscos
      </p>

      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        {Object.entries(TIPOS_RISCO).map(([t, nome]) => (
          <span key={t} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: COR_TIPO[t] }} /> {nome}
          </span>
        ))}
        <span className="text-slate-500">Tamanho do círculo: baixo, moderado, alto, crítico</span>
      </div>

      {(unidades ?? []).map((u) => (
        <section key={u.id} className="mt-6 break-inside-avoid">
          <h2 className="font-semibold">{u.name}</h2>
          <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(setores ?? [])
              .filter((s) => s.unit_id === u.id)
              .map((s) => {
                const rs = doSetor(s.id);
                return (
                  <div key={s.id} className="break-inside-avoid rounded-lg border-2 border-slate-300 bg-white p-3">
                    <p className="font-medium">{s.name}</p>
                    <div className="mt-2 flex min-h-12 flex-wrap items-center gap-2">
                      {rs.map((r) => (
                        <svg key={r.id} width={raio(r.level) * 2} height={raio(r.level) * 2} aria-label={r.hazard}>
                          <title>{`${TIPOS_RISCO[r.risk_type]}: ${r.hazard} (${classificar(r.level).nome})`}</title>
                          <circle cx={raio(r.level)} cy={raio(r.level)} r={raio(r.level)} fill={COR_TIPO[r.risk_type]} />
                        </svg>
                      ))}
                      {!rs.length && <span className="text-xs text-slate-400">Sem riscos cadastrados</span>}
                    </div>
                    <ul className="mt-2 space-y-0.5 text-xs text-slate-700">
                      {rs.map((r) => (
                        <li key={r.id}>
                          <span className="inline-block h-2 w-2 rounded-full" style={{ background: COR_TIPO[r.risk_type] }} />{" "}
                          {r.hazard} · {classificar(r.level).nome} ({r.level}) · {r.activities.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
          </div>
        </section>
      ))}
      {!setores?.length && <p className="mt-6 text-sm text-slate-500">Cadastre unidades e setores para ver o mapa.</p>}
    </div>
  );
}
