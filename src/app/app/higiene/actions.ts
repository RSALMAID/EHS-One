"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { somarDias, hoje } from "@/lib/datas";
import { campo, seErro } from "@/lib/form";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const PATH = "/app/higiene";

function numero(formData: FormData, nome: string): number | null {
  const v = String(formData.get(nome) ?? "").trim().replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function criarGhe(formData: FormData) {
  const org = await requireOrg();
  const nome = campo(formData, "nome");
  if (!nome) redirect(`${PATH}?erro=${encodeURIComponent("Dê um nome ao GHE.")}`);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exposure_groups")
    .insert({
      organization_id: org.id,
      name: nome,
      sector_id: campo(formData, "setor"),
      activities: campo(formData, "atividades"),
      workers_count: numero(formData, "pessoas"),
    })
    .select("id")
    .single();
  seErro(PATH, error);
  redirect(`${PATH}/${data!.id}`);
}

export async function salvarGhe(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const nome = campo(formData, "nome");
  if (!nome) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("exposure_groups")
    .update({
      name: nome,
      sector_id: campo(formData, "setor"),
      activities: campo(formData, "atividades"),
      workers_count: numero(formData, "pessoas"),
      active: formData.get("ativo") === "on",
    })
    .eq("id", id);
  seErro(`${PATH}/${id}`, error);
  revalidatePath(PATH, "layout");
}

export async function adicionarAvaliacao(formData: FormData) {
  const org = await requireOrg();
  const ghe = String(formData.get("ghe"));
  const path = `${PATH}/${ghe}`;
  const agente = campo(formData, "agente");
  const resultado = numero(formData, "resultado");
  const unidade = campo(formData, "unidade");
  if (!agente || resultado === null || !unidade) {
    redirect(`${path}?erro=${encodeURIComponent("Preencha o agente, o resultado e a unidade.")}`);
  }
  const supabase = await createClient();
  const { error } = await supabase.from("exposure_assessments").insert({
    organization_id: org.id,
    group_id: ghe,
    agent: agente,
    agent_type: String(formData.get("tipo") || "fisico"),
    method: campo(formData, "metodo"),
    measured_on: campo(formData, "data") ?? undefined,
    result: resultado,
    unit: unidade,
    limit_value: numero(formData, "limite"),
    action_level: numero(formData, "nivel"),
    equipment: campo(formData, "equipamento"),
    evaluator: campo(formData, "avaliador"),
    notes: campo(formData, "obs"),
  });
  seErro(path, error);
  revalidatePath(PATH, "layout");
}

export async function removerAvaliacao(formData: FormData) {
  await requireOrg();
  const path = `${PATH}/${String(formData.get("ghe"))}`;
  const supabase = await createClient();
  const { error } = await supabase.from("exposure_assessments").delete().eq("id", String(formData.get("id")));
  seErro(path, error);
  revalidatePath(PATH, "layout");
}

/** Exposição acima do nível de ação vira ação no plano de ação do PGR. */
export async function abrirAcaoExposicao(formData: FormData) {
  const org = await requireOrg();
  const path = `${PATH}/${String(formData.get("ghe"))}`;
  const supabase = await createClient();
  const { error } = await supabase.from("actions").insert({
    organization_id: org.id,
    origin: "pgr",
    origin_ref: String(formData.get("id")),
    problem: String(formData.get("problema")),
    action: "Reduzir a exposição: rever controles coletivos, administrativos e EPI, e reavaliar",
    due_date: somarDias(hoje(), 30),
  });
  seErro(path, error);
  revalidatePath("/app/acoes", "layout");
  redirect(`${path}?ok=acao`);
}

/* ---------------- Meio ambiente ---------------- */

const AMB = "/app/ambiente";

export async function adicionarAspecto(formData: FormData) {
  const org = await requireOrg();
  const s = Number(formData.get("severidade"));
  const p = Number(formData.get("probabilidade"));
  const atividade = campo(formData, "atividade");
  const aspecto = campo(formData, "aspecto");
  const impacto = campo(formData, "impacto");
  if (!atividade || !aspecto || !impacto || !(s >= 1 && s <= 5) || !(p >= 1 && p <= 5)) {
    redirect(`${AMB}?erro=${encodeURIComponent("Preencha atividade, aspecto, impacto, severidade e probabilidade.")}`);
  }
  const supabase = await createClient();
  const { error } = await supabase.from("env_aspects").insert({
    organization_id: org.id,
    sector_id: campo(formData, "setor"),
    activity: atividade,
    aspect: aspecto,
    impact: impacto,
    condition: String(formData.get("condicao") || "normal"),
    severity: s,
    probability: p,
    legal_requirement: campo(formData, "requisito"),
    controls: campo(formData, "controles"),
  });
  seErro(AMB, error);
  revalidatePath(AMB);
}

export async function removerAspecto(formData: FormData) {
  await requireOrg();
  const supabase = await createClient();
  const { error } = await supabase.from("env_aspects").delete().eq("id", String(formData.get("id")));
  seErro(AMB, error);
  revalidatePath(AMB);
}

export async function registrarResiduo(formData: FormData) {
  const org = await requireOrg();
  const volta = `${AMB}?aba=residuos`;
  const residuo = campo(formData, "residuo");
  const qtd = numero(formData, "quantidade");
  if (!residuo || !qtd || qtd <= 0) redirect(`${volta}&erro=${encodeURIComponent("Preencha o resíduo e a quantidade.")}`);
  const supabase = await createClient();
  const { error } = await supabase.from("waste_records").insert({
    organization_id: org.id,
    recorded_on: campo(formData, "data") ?? undefined,
    waste: residuo,
    waste_class: String(formData.get("classe") || "IIA"),
    quantity: qtd,
    unit: String(formData.get("unidade") || "kg"),
    destination: campo(formData, "destino"),
    transporter: campo(formData, "transportador"),
    mtr_number: campo(formData, "mtr"),
    sector_id: campo(formData, "setor"),
  });
  if (error) redirect(`${volta}&erro=${encodeURIComponent(error.message)}`);
  revalidatePath(AMB);
  redirect(volta);
}

export async function removerResiduo(formData: FormData) {
  await requireOrg();
  const supabase = await createClient();
  const { error } = await supabase.from("waste_records").delete().eq("id", String(formData.get("id")));
  if (error) redirect(`${AMB}?aba=residuos&erro=${encodeURIComponent(error.message)}`);
  revalidatePath(AMB);
  redirect(`${AMB}?aba=residuos`);
}
