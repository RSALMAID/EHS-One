import Link from "next/link";
import { notFound } from "next/navigation";
import { Erro } from "@/components/Erro";
import { requireOrg } from "@/lib/org";
import { NivelBadge, PROBABILIDADE, SEVERIDADE, TIPOS_RISCO } from "@/lib/risco";
import { createClient } from "@/lib/supabase/server";
import { criarAcaoDoRisco, removerRisco, salvarRisco, validarRisco } from "@/app/app/pgr/actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; editar?: string }>;
};

type Risco = {
  id: string;
  risk_type: string;
  hazard: string;
  source: string | null;
  possible_harm: string | null;
  exposed_count: number | null;
  severity: number;
  probability: number;
  level: number;
  existing_controls: string | null;
  residual_severity: number | null;
  residual_probability: number | null;
  validated_at: string | null;
};

export default async function AtividadePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { erro, editar } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();

  const { data: atividade } = await supabase
    .from("activities")
    .select("id, name, description, processes(name, sectors(name, units(name)))")
    .eq("id", id)
    .eq("organization_id", org.id)
    .maybeSingle();
  if (!atividade) notFound();

  const [{ data: riscos }, { data: cargos }, { data: vinculos }, { data: acoes }] = await Promise.all([
    supabase
      .from("risks")
      .select("id, risk_type, hazard, source, possible_harm, exposed_count, severity, probability, level, existing_controls, residual_severity, residual_probability, validated_at")
      .eq("activity_id", id)
      .order("level", { ascending: false }),
    supabase.from("job_roles").select("id, name").eq("organization_id", org.id).order("name"),
    supabase.from("risk_job_roles").select("risk_id, job_role_id").eq("organization_id", org.id),
    supabase.from("actions").select("number, action, status, origin_ref").eq("organization_id", org.id).eq("origin", "pgr"),
  ]);

  const proc = atividade.processes as unknown as { name: string; sectors: { name: string; units: { name: string } } } | null;
  const caminho = proc ? `${proc.sectors.units.name} › ${proc.sectors.name} › ${proc.name}` : "";
  const cargosDo = (riscoId: string) => (vinculos ?? []).filter((v) => v.risk_id === riscoId).map((v) => v.job_role_id);
  const nomeCargo = (cid: string) => cargos?.find((c) => c.id === cid)?.name ?? "";
  const emEdicao = (riscos as Risco[] | null)?.find((r) => r.id === editar);

  const Formulario = ({ r }: { r?: Risco }) => (
    <form action={salvarRisco} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
      <input type="hidden" name="atividade" value={id} />
      {r && <input type="hidden" name="id" value={r.id} />}
      <p className="font-semibold sm:col-span-2">{r ? "Editar risco" : "Novo risco"}</p>
      <label className="text-sm">
        Tipo
        <select name="tipo" defaultValue={r?.risk_type ?? "fisico"} className="input mt-1">
          {Object.entries(TIPOS_RISCO).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Perigo / fator de risco
        <input name="perigo" required defaultValue={r?.hazard ?? ""} className="input mt-1" placeholder="Ruído, fumos metálicos, queda de altura…" />
      </label>
      <label className="text-sm">
        Fonte ou circunstância
        <input name="fonte" defaultValue={r?.source ?? ""} className="input mt-1" placeholder="Esmerilhadeira, máquina de solda…" />
      </label>
      <label className="text-sm">
        Possíveis lesões ou agravos
        <input name="dano" defaultValue={r?.possible_harm ?? ""} className="input mt-1" placeholder="PAIR, queimaduras…" />
      </label>
      <label className="text-sm">
        Severidade
        <select name="severidade" required defaultValue={r?.severity ?? ""} className="input mt-1">
          <option value="" disabled>Escolha</option>
          {SEVERIDADE.slice(1).map((l, i) => (
            <option key={l} value={i + 1}>{l}</option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Probabilidade
        <select name="probabilidade" required defaultValue={r?.probability ?? ""} className="input mt-1">
          <option value="" disabled>Escolha</option>
          {PROBABILIDADE.slice(1).map((l, i) => (
            <option key={l} value={i + 1}>{l}</option>
          ))}
        </select>
      </label>
      <label className="text-sm sm:col-span-2">
        Controles existentes
        <textarea name="controles" defaultValue={r?.existing_controls ?? ""} rows={2} className="input mt-1" placeholder="Exaustão local, protetor auricular, rodízio…" />
      </label>
      <label className="text-sm">
        Severidade residual (com controles)
        <select name="sev_residual" defaultValue={r?.residual_severity ?? ""} className="input mt-1">
          <option value="">—</option>
          {SEVERIDADE.slice(1).map((l, i) => (
            <option key={l} value={i + 1}>{l}</option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Probabilidade residual
        <select name="prob_residual" defaultValue={r?.residual_probability ?? ""} className="input mt-1">
          <option value="">—</option>
          {PROBABILIDADE.slice(1).map((l, i) => (
            <option key={l} value={i + 1}>{l}</option>
          ))}
        </select>
      </label>
      <fieldset className="text-sm sm:col-span-2">
        <legend>Cargos expostos</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {(cargos ?? []).map((c) => (
            <label key={c.id} className="flex items-center gap-1">
              <input type="checkbox" name="cargos" value={c.id} defaultChecked={r ? cargosDo(r.id).includes(c.id) : false} /> {c.name}
            </label>
          ))}
          {!cargos?.length && <span className="text-slate-500">Cadastre cargos em Cargos e funções.</span>}
        </div>
      </fieldset>
      <label className="text-sm">
        Nº de trabalhadores expostos
        <input name="expostos" type="number" min={0} defaultValue={r?.exposed_count ?? ""} className="input mt-1" />
      </label>
      <div className="flex items-end gap-2">
        <button className="btn">Salvar risco</button>
        {r && <Link href={`/app/pgr/atividade/${id}`} className="btn-ghost">Cancelar</Link>}
      </div>
    </form>
  );

  return (
    <div>
      <Link href="/app/pgr" className="text-sm text-emerald-700 underline">← GRO / PGR</Link>
      <p className="mt-3 text-xs text-slate-500">{caminho}</p>
      <h1 className="text-2xl font-bold">{atividade.name}</h1>
      {atividade.description && <p className="mt-1 text-sm text-slate-600">{atividade.description}</p>}
      <Erro mensagem={erro} />

      <ul className="mt-6 space-y-3">
        {((riscos ?? []) as Risco[]).map((r) => {
          const residual = r.residual_severity && r.residual_probability ? r.residual_severity * r.residual_probability : null;
          const acoesDoRisco = (acoes ?? []).filter((a) => a.origin_ref === r.id);
          return (
            <li key={r.id} className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-500">{TIPOS_RISCO[r.risk_type]}</p>
                  <p className="font-medium">{r.hazard}</p>
                  <p className="text-slate-600">
                    {r.source && <>Fonte: {r.source}. </>}
                    {r.possible_harm && <>Agravos: {r.possible_harm}.</>}
                  </p>
                </div>
                <div className="text-right">
                  <NivelBadge nivel={r.level} />
                  <p className="mt-1 text-xs text-slate-500">S{r.severity} × P{r.probability}</p>
                  {residual && <p className="mt-1 text-xs">Residual: <NivelBadge nivel={residual} /></p>}
                </div>
              </div>
              {r.existing_controls && <p className="mt-2"><span className="text-slate-500">Controles:</span> {r.existing_controls}</p>}
              <p className="mt-1 text-slate-600">
                <span className="text-slate-500">Expostos:</span>{" "}
                {cargosDo(r.id).map(nomeCargo).join(", ") || "—"}
                {r.exposed_count != null && ` (${r.exposed_count} pessoas)`}
              </p>
              {acoesDoRisco.length > 0 && (
                <p className="mt-1 text-slate-600">
                  <span className="text-slate-500">Ações:</span>{" "}
                  {acoesDoRisco.map((a) => `#${String(a.number).padStart(4, "0")} ${a.action}`).join("; ")}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                <Link href={`/app/pgr/atividade/${id}?editar=${r.id}`} className="text-xs text-emerald-700 underline">Editar</Link>
                {r.validated_at ? (
                  <span className="text-xs text-emerald-700">Validado em {new Date(r.validated_at).toLocaleDateString("pt-BR")}</span>
                ) : (
                  <form action={validarRisco}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="atividade" value={id} />
                    <button className="text-xs text-emerald-700 underline">Validar (profissional)</button>
                  </form>
                )}
                <form action={removerRisco}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="atividade" value={id} />
                  <button className="text-xs text-red-600 hover:underline">Remover</button>
                </form>
                <form action={criarAcaoDoRisco} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="risco" value={r.id} />
                  <input type="hidden" name="atividade" value={id} />
                  <input type="hidden" name="problema" value={`${r.hazard} em ${atividade.name}`} />
                  <input name="acao" required placeholder="Ação de controle" className="input w-56 py-1 text-xs" />
                  <input name="prazo" type="date" className="input w-36 py-1 text-xs" />
                  <button className="btn-ghost px-2 py-1 text-xs">Criar ação</button>
                </form>
              </div>
            </li>
          );
        })}
        {!riscos?.length && (
          <li className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Nenhum risco nesta atividade ainda.
          </li>
        )}
      </ul>

      <div className="mt-6">
        <Formulario key={emEdicao?.id ?? "novo"} r={emEdicao} />
      </div>
    </div>
  );
}
