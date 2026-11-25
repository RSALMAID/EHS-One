"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { campo, seErro } from "@/lib/form";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const PATH = "/app/pgr";

export async function adicionarProcesso(formData: FormData) {
  const org = await requireOrg();
  const nome = campo(formData, "nome");
  const setor = campo(formData, "setor");
  if (!nome || !setor) return;
  const supabase = await createClient();
  const { error } = await supabase.from("processes").insert({ organization_id: org.id, sector_id: setor, name: nome });
  seErro(PATH, error);
  revalidatePath(PATH);
}

export async function adicionarAtividade(formData: FormData) {
  const org = await requireOrg();
  const nome = campo(formData, "nome");
  const processo = campo(formData, "processo");
  if (!nome || !processo) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("activities")
    .insert({ organization_id: org.id, process_id: processo, name: nome, description: campo(formData, "descricao") });
  seErro(PATH, error);
  revalidatePath(PATH);
}

export async function removerProcesso(formData: FormData) {
  await requireOrg();
  const supabase = await createClient();
  const { error } = await supabase.from("processes").delete().eq("id", String(formData.get("id")));
  seErro(PATH, error);
  revalidatePath(PATH);
}

export async function removerAtividade(formData: FormData) {
  await requireOrg();
  const supabase = await createClient();
  const { error } = await supabase.from("activities").delete().eq("id", String(formData.get("id")));
  seErro(PATH, error);
  revalidatePath(PATH);
}

function nota(formData: FormData, nome: string): number | null {
  const n = Number(formData.get(nome));
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

export async function salvarRisco(formData: FormData) {
  const org = await requireOrg();
  const atividade = String(formData.get("atividade"));
  const path = `${PATH}/atividade/${atividade}`;
  const id = campo(formData, "id");
  const severidade = nota(formData, "severidade");
  const probabilidade = nota(formData, "probabilidade");
  const perigo = campo(formData, "perigo");
  if (!severidade || !probabilidade || !perigo) {
    redirect(`${path}?erro=${encodeURIComponent("Preencha perigo, severidade e probabilidade.")}`);
  }
  const supabase = await createClient();
  const dados = {
    organization_id: org.id,
    activity_id: atividade,
    risk_type: String(formData.get("tipo")),
    hazard: perigo,
    source: campo(formData, "fonte"),
    possible_harm: campo(formData, "dano"),
    exposed_count: Number(formData.get("expostos")) || null,
    severity: severidade,
    probability: probabilidade,
    existing_controls: campo(formData, "controles"),
    residual_severity: nota(formData, "sev_residual"),
    residual_probability: nota(formData, "prob_residual"),
  };
  const { data, error } = id
    ? await supabase.from("risks").update(dados).eq("id", id).select("id").single()
    : await supabase.from("risks").insert(dados).select("id").single();
  seErro(path, error);

  const riscoId = data!.id as string;
  const cargos = formData.getAll("cargos").map(String).filter(Boolean);
  const { error: e1 } = await supabase.from("risk_job_roles").delete().eq("risk_id", riscoId);
  seErro(path, e1);
  if (cargos.length) {
    const { error: e2 } = await supabase
      .from("risk_job_roles")
      .insert(cargos.map((c) => ({ risk_id: riscoId, job_role_id: c, organization_id: org.id })));
    seErro(path, e2);
  }
  revalidatePath(path);
  redirect(path);
}

export async function removerRisco(formData: FormData) {
  await requireOrg();
  const path = `${PATH}/atividade/${String(formData.get("atividade"))}`;
  const supabase = await createClient();
  const { error } = await supabase.from("risks").delete().eq("id", String(formData.get("id")));
  seErro(path, error);
  revalidatePath(path);
}

export async function validarRisco(formData: FormData) {
  await requireOrg();
  const path = `${PATH}/atividade/${String(formData.get("atividade"))}`;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("risks")
    .update({ validated_by: user?.id ?? null, validated_at: new Date().toISOString() })
    .eq("id", String(formData.get("id")));
  seErro(path, error);
  revalidatePath(path);
}

/** Cria uma ação na Central de Ações ligada ao risco. */
export async function criarAcaoDoRisco(formData: FormData) {
  const org = await requireOrg();
  const path = `${PATH}/atividade/${String(formData.get("atividade"))}`;
  const acao = campo(formData, "acao");
  if (!acao) return;
  const supabase = await createClient();
  const { error } = await supabase.from("actions").insert({
    organization_id: org.id,
    origin: "pgr",
    origin_ref: String(formData.get("risco")),
    problem: String(formData.get("problema") ?? "Risco do PGR"),
    action: acao,
    due_date: campo(formData, "prazo"),
  });
  seErro(path, error);
  revalidatePath(path);
  revalidatePath("/app/acoes");
}
