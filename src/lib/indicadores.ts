import { hoje } from "./datas";
import { createClient } from "./supabase/server";

export const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MILHAO = 1_000_000;

export type Mes = {
  mes: number; // 0 a 11
  hht: number | null;
  trabalhadores: number | null;
  comLesao: number; // acidentes com e sem afastamento
  comAfastamento: number;
  dias: number; // perdidos + debitados
  tf: number | null;
  tg: number | null;
};

/** TF = acidentes × 1.000.000 / HHT; TG = (dias perdidos + debitados) × 1.000.000 / HHT (NBR 14280). */
export const taxa = (n: number, hht: number | null) => (hht ? (n * MILHAO) / hht : null);
export const fmt = (n: number | null, casas = 2) =>
  n === null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** Tudo o que o Painel mostra para um ano. Cada consulta respeita a RLS (só a equipe vê). */
export async function indicadores(orgId: string, ano: number) {
  const supabase = await createClient();
  const ini = `${ano}-01-01`;
  const fim = `${ano + 1}-01-01`;
  const [{ data: hht }, { data: eventos }, { data: acoes }, { data: inspecoes }, { data: dds }] = await Promise.all([
    supabase.from("hht_records").select("month, workers_count, hours_worked").eq("organization_id", orgId).gte("month", ini).lt("month", fim),
    supabase
      .from("events")
      .select("kind, occurred_at, lost_days, debited_days, status")
      .eq("organization_id", orgId)
      .neq("status", "cancelado")
      .gte("occurred_at", ini)
      .lt("occurred_at", fim),
    supabase.from("actions").select("status, due_date, closed_at").eq("organization_id", orgId),
    supabase
      .from("inspections")
      .select("status, inspection_answers(answer)")
      .eq("organization_id", orgId)
      .gte("inspected_on", ini)
      .lt("inspected_on", fim),
    supabase
      .from("dds_talks")
      .select("id, dds_attendances(confirmed_at)")
      .eq("organization_id", orgId)
      .gte("held_on", ini)
      .lt("held_on", fim),
  ]);

  const meses: Mes[] = MESES.map((_, mes) => ({
    mes,
    hht: null,
    trabalhadores: null,
    comLesao: 0,
    comAfastamento: 0,
    dias: 0,
    tf: null,
    tg: null,
  }));
  for (const h of hht ?? []) {
    const m = meses[Number(h.month.slice(5, 7)) - 1];
    m.hht = Number(h.hours_worked);
    m.trabalhadores = h.workers_count;
  }
  const porTipo: Record<string, number> = {};
  for (const e of eventos ?? []) {
    porTipo[e.kind] = (porTipo[e.kind] ?? 0) + 1;
    // mês no fuso de Brasília
    const mes = Number(new Date(e.occurred_at).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(5, 7)) - 1;
    const m = meses[mes];
    if (e.kind === "acidente_com_afastamento" || e.kind === "acidente_sem_afastamento") m.comLesao++;
    if (e.kind === "acidente_com_afastamento") m.comAfastamento++;
    m.dias += (e.lost_days ?? 0) + (e.debited_days ?? 0);
  }
  for (const m of meses) {
    m.tf = taxa(m.comLesao, m.hht);
    m.tg = taxa(m.dias, m.hht);
  }
  const soma = (f: (m: Mes) => number) => meses.reduce((s, m) => s + f(m), 0);
  const hhtAno = soma((m) => m.hht ?? 0) || null;
  const total = {
    hht: hhtAno,
    comLesao: soma((m) => m.comLesao),
    comAfastamento: soma((m) => m.comAfastamento),
    dias: soma((m) => m.dias),
    // Meses com acidente mas sem HHT ficam fora da taxa: avisa na tela.
    mesesSemHht: meses.filter((m) => m.hht === null && (m.comLesao > 0 || m.dias > 0)).length,
  };

  const h = hoje();
  const lista = acoes ?? [];
  const aberta = (s: string) => s !== "concluida" && s !== "cancelada";
  const acoesResumo = {
    abertas: lista.filter((a) => aberta(a.status)).length,
    atrasadas: lista.filter((a) => aberta(a.status) && a.due_date && a.due_date < h).length,
    concluidasNoAno: lista.filter((a) => a.status === "concluida" && a.closed_at?.startsWith(String(ano))).length,
  };

  const respostas = (inspecoes ?? []).flatMap((i) => (i.inspection_answers as { answer: string | null }[]) ?? []);
  const conformes = respostas.filter((r) => r.answer === "conforme").length;
  const ncs = respostas.filter((r) => r.answer === "nao_conforme").length;
  const inspecoesResumo = {
    concluidas: (inspecoes ?? []).filter((i) => i.status === "concluida").length,
    naoConformidades: ncs,
    conformidade: conformes + ncs ? Math.round((conformes / (conformes + ncs)) * 100) : null,
  };

  const presencas = (dds ?? []).flatMap((d) => (d.dds_attendances as { confirmed_at: string | null }[]) ?? []);
  const ddsResumo = {
    realizados: dds?.length ?? 0,
    presencas: presencas.filter((p) => p.confirmed_at).length,
  };

  return {
    meses,
    total,
    tf: taxa(total.comLesao, hhtAno),
    tg: taxa(total.dias, hhtAno),
    porTipo,
    acoes: acoesResumo,
    inspecoes: inspecoesResumo,
    dds: ddsResumo,
  };
}
