"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dataBR, hoje, somarDias } from "@/lib/datas";
import { campo, seErro } from "@/lib/form";
import { NORMAS, numeroAuditoria, STATUS_OBJETIVO, TIPOS_AUDITORIA, TIPOS_CONSTATACAO } from "@/lib/iso";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const BASE = "/app/iso";
const erro = (path: string, msg: string): never => redirect(`${path}?erro=${encodeURIComponent(msg)}`);
const pronto = (path: string) => {
  revalidatePath(BASE, "layout");
  redirect(path);
};
const norma = (formData: FormData) => {
  const n = String(formData.get("norma") || "ambas");
  return NORMAS[n] ? n : "ambas";
};
function numero(formData: FormData, nome: string): number | null {
  const v = String(formData.get(nome) ?? "").trim().replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ---------------- Objetivos e metas ---------------- */

export async function criarObjetivo(formData: FormData) {
  const org = await requireOrg();
  const path = `${BASE}/objetivos`;
  const titulo = campo(formData, "titulo");
  if (!titulo) erro(path, "Diga qual é o objetivo.");
  const supabase = await createClient();
  const { error } = await supabase.from("iso_objectives").insert({
    organization_id: org.id,
    standard: norma(formData),
    title: titulo,
    indicator: campo(formData, "indicador"),
    unit: campo(formData, "unidade"),
    baseline: numero(formData, "base"),
    target: numero(formData, "meta"),
    direction: ["reduzir", "aumentar", "manter"].includes(String(formData.get("direcao"))) ? String(formData.get("direcao")) : "reduzir",
    due_on: campo(formData, "prazo"),
    responsible_id: campo(formData, "responsavel"),
    notes: campo(formData, "obs"),
  });
  seErro(path, error);
  pronto(path);
}

export async function medirObjetivo(formData: FormData) {
  const org = await requireOrg();
  const path = `${BASE}/objetivos`;
  const valor = numero(formData, "valor");
  if (valor === null) erro(path, "Informe o valor medido.");
  const supabase = await createClient();
  const { error } = await supabase.from("iso_objective_measurements").insert({
    organization_id: org.id,
    objective_id: String(formData.get("id")),
    measured_on: campo(formData, "data") ?? hoje(),
    value: valor,
    notes: campo(formData, "obs"),
  });
  seErro(path, error);
  pronto(path);
}

export async function situacaoObjetivo(formData: FormData) {
  await requireOrg();
  const path = `${BASE}/objetivos`;
  const status = String(formData.get("status"));
  if (!STATUS_OBJETIVO[status]) erro(path, "Situação inválida.");
  const supabase = await createClient();
  const { error } = await supabase.from("iso_objectives").update({ status }).eq("id", String(formData.get("id")));
  seErro(path, error);
  pronto(path);
}

export async function excluirObjetivo(formData: FormData) {
  await requireOrg();
  const path = `${BASE}/objetivos`;
  const supabase = await createClient();
  const { error } = await supabase.from("iso_objectives").delete().eq("id", String(formData.get("id")));
  seErro(path, error);
  pronto(path);
}

/* ---------------- Auditorias ---------------- */

export async function criarAuditoria(formData: FormData) {
  const org = await requireOrg();
  const path = `${BASE}/auditorias`;
  const data = campo(formData, "data");
  const tipo = String(formData.get("tipo") || "interna");
  if (!data) erro(path, "Informe a data planejada.");
  const supabase = await createClient();
  const { data: a, error } = await supabase
    .from("audits")
    .insert({
      organization_id: org.id,
      standard: norma(formData),
      kind: TIPOS_AUDITORIA[tipo] ? tipo : "interna",
      scope: campo(formData, "escopo"),
      planned_on: data,
      auditor: campo(formData, "auditor"),
    })
    .select("id")
    .single();
  seErro(path, error);
  pronto(`${path}/${a!.id}`);
}

export async function salvarAuditoria(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const path = `${BASE}/auditorias/${id}`;
  const status = String(formData.get("status") || "planejada");
  const realizada = campo(formData, "realizada");
  if (status === "realizada" && !realizada) erro(path, "Informe a data em que a auditoria foi realizada.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("audits")
    .update({
      standard: norma(formData),
      scope: campo(formData, "escopo"),
      planned_on: campo(formData, "data") ?? undefined,
      done_on: realizada,
      auditor: campo(formData, "auditor"),
      status: ["planejada", "realizada", "cancelada"].includes(status) ? status : "planejada",
      summary: campo(formData, "resumo"),
    })
    .eq("id", id);
  seErro(path, error);
  pronto(`${path}?ok=1`);
}

export async function excluirAuditoria(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("audits").delete().eq("id", id);
  seErro(`${BASE}/auditorias/${id}`, error);
  pronto(`${BASE}/auditorias`);
}

/** Constatação; se pedir, abre ação num plano de ação próprio da auditoria. */
export async function adicionarConstatacao(formData: FormData) {
  const org = await requireOrg();
  const auditoria = String(formData.get("auditoria"));
  const path = `${BASE}/auditorias/${auditoria}`;
  const tipo = String(formData.get("tipo"));
  const descricao = campo(formData, "descricao");
  if (!TIPOS_CONSTATACAO[tipo] || !descricao) erro(path, "Escolha o tipo e descreva a constatação.");
  const supabase = await createClient();
  let acao: string | null = null;
  if (TIPOS_CONSTATACAO[tipo].acao && formData.get("abrir_acao") === "on") {
    const { data: a } = await supabase.from("audits").select("number, standard, kind, planned_on, done_on").eq("id", auditoria).maybeSingle();
    if (!a) erro(path, "Auditoria não encontrada.");
    const prazo = campo(formData, "prazo") ?? somarDias(hoje(), 30);
    let { data: plano } = await supabase
      .from("action_plans")
      .select("id")
      .eq("organization_id", org.id)
      .eq("origin", "auditoria")
      .eq("origin_ref", auditoria)
      .in("status", ["aberto", "em_andamento"])
      .limit(1)
      .maybeSingle();
    if (!plano) {
      const { data: p, error } = await supabase
        .from("action_plans")
        .insert({
          organization_id: org.id,
          title: `${numeroAuditoria(a!.number)} · Auditoria ${TIPOS_AUDITORIA[a!.kind].split(" ")[0].toLowerCase()} ${NORMAS[a!.standard]} · ${dataBR(a!.done_on ?? a!.planned_on)}`,
          origin: "auditoria",
          origin_ref: auditoria,
          due_date: prazo,
        })
        .select("id")
        .single();
      seErro(path, error);
      plano = p;
    }
    const clausula = campo(formData, "clausula");
    const { data: nova, error } = await supabase
      .from("actions")
      .insert({
        organization_id: org.id,
        plan_id: plano!.id,
        origin: "auditoria",
        origin_ref: auditoria,
        problem: `${TIPOS_CONSTATACAO[tipo].nome}${clausula ? ` (${clausula})` : ""}: ${descricao}`,
        action: campo(formData, "acao") ?? "Analisar a causa e corrigir",
        responsible_id: campo(formData, "responsavel"),
        due_date: prazo,
      })
      .select("id")
      .single();
    seErro(path, error);
    acao = nova!.id;
  }
  const { error } = await supabase.from("audit_findings").insert({
    organization_id: org.id,
    audit_id: auditoria,
    clause: campo(formData, "clausula"),
    kind: tipo,
    description: descricao,
    evidence: campo(formData, "evidencia"),
    action_id: acao,
  });
  seErro(path, error);
  if (acao) revalidatePath("/app/acoes", "layout");
  pronto(`${path}?ok=${acao ? "acao" : "1"}`);
}

export async function removerConstatacao(formData: FormData) {
  await requireOrg();
  const path = `${BASE}/auditorias/${String(formData.get("auditoria"))}`;
  const supabase = await createClient();
  const { error } = await supabase.from("audit_findings").delete().eq("id", String(formData.get("id")));
  seErro(path, error);
  pronto(path);
}

/* ---------------- Análise crítica ---------------- */

export async function salvarAnalise(formData: FormData) {
  const org = await requireOrg();
  const path = `${BASE}/analise`;
  const data = campo(formData, "data");
  if (!data) erro(path, "Informe a data da reunião.");
  const id = campo(formData, "id");
  const dados = {
    standard: norma(formData),
    held_on: data,
    participants: campo(formData, "participantes"),
    inputs: campo(formData, "entradas"),
    decisions: campo(formData, "saidas"),
  };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("management_reviews").update(dados).eq("id", id)
    : await supabase.from("management_reviews").insert({ organization_id: org.id, ...dados });
  seErro(path, error);
  pronto(`${path}?ok=1`);
}

export async function excluirAnalise(formData: FormData) {
  await requireOrg();
  const path = `${BASE}/analise`;
  const supabase = await createClient();
  const { error } = await supabase.from("management_reviews").delete().eq("id", String(formData.get("id")));
  seErro(path, error);
  pronto(path);
}
