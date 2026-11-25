"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nomeArquivo } from "@/lib/acoes";
import { campo, seErro } from "@/lib/form";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const PATH = "/app/acoes";
const plano = (id: string) => `${PATH}/plano/${id}`;

function atualizar() {
  revalidatePath(PATH, "layout");
  revalidatePath("/app");
  revalidatePath("/meu", "layout");
}

export async function criarPlano(formData: FormData) {
  const org = await requireOrg();
  const titulo = campo(formData, "titulo");
  if (!titulo) return;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("action_plans")
    .insert({
      organization_id: org.id,
      title: titulo,
      objective: campo(formData, "objetivo"),
      origin: String(formData.get("origem") ?? "outro"),
      owner_id: campo(formData, "dono"),
      due_date: campo(formData, "prazo"),
    })
    .select("id")
    .single();
  seErro(PATH, error);
  redirect(plano(data!.id));
}

export async function salvarPlano(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const titulo = campo(formData, "titulo");
  if (!titulo) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("action_plans")
    .update({
      title: titulo,
      objective: campo(formData, "objetivo"),
      owner_id: campo(formData, "dono"),
      due_date: campo(formData, "prazo"),
      status: String(formData.get("status")),
    })
    .eq("id", id);
  seErro(plano(id), error);
  atualizar();
}

export async function criarAcao(formData: FormData) {
  const org = await requireOrg();
  const planoId = String(formData.get("plano"));
  const problema = campo(formData, "problema");
  const acao = campo(formData, "acao");
  if (!problema || !acao) return;
  const supabase = await createClient();
  const { data: p } = await supabase.from("action_plans").select("origin, origin_ref").eq("id", planoId).single();
  const { error } = await supabase.from("actions").insert({
    organization_id: org.id,
    plan_id: planoId,
    origin: p?.origin ?? "outro",
    origin_ref: p?.origin_ref ?? null,
    problem: problema,
    action: acao,
    responsible_id: campo(formData, "responsavel"),
    due_date: campo(formData, "prazo"),
    evidence_required: campo(formData, "evidencia"),
  });
  seErro(plano(planoId), error);
  atualizar();
}

export async function mudarStatus(formData: FormData) {
  await requireOrg();
  const status = String(formData.get("status"));
  const volta = String(formData.get("voltar") || PATH);
  const supabase = await createClient();
  const { error } = await supabase
    .from("actions")
    .update({ status, closed_at: status === "concluida" ? new Date().toISOString() : null })
    .eq("id", String(formData.get("id")));
  seErro(volta, error);
  atualizar();
}

export async function avaliarEficacia(formData: FormData) {
  await requireOrg();
  const volta = String(formData.get("voltar") || PATH);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("actions")
    .update({
      efficacy_result: String(formData.get("resultado")),
      efficacy_notes: campo(formData, "obs"),
      efficacy_checked_at: new Date().toISOString(),
      efficacy_checked_by: user?.id,
    })
    .eq("id", String(formData.get("id")));
  seErro(volta, error);
  atualizar();
}

/** Evidência: texto e/ou arquivo (foto, PDF) guardado no bucket "evidencias". */
export async function adicionarEvidencia(formData: FormData) {
  const org = await requireOrg();
  const acao = String(formData.get("id"));
  const volta = String(formData.get("voltar") || PATH);
  const nota = campo(formData, "nota");
  const arquivo = formData.get("arquivo");
  const temArquivo = arquivo instanceof File && arquivo.size > 0;
  if (!nota && !temArquivo) return;
  const supabase = await createClient();
  let caminho: string | null = null;
  if (temArquivo) {
    caminho = `${org.id}/${acao}/${nomeArquivo(arquivo.name)}`;
    const { error } = await supabase.storage.from("evidencias").upload(caminho, arquivo, { contentType: arquivo.type });
    seErro(volta, error);
  }
  const { error } = await supabase.from("action_evidences").insert({
    organization_id: org.id,
    action_id: acao,
    note: nota,
    file_path: caminho,
    file_name: temArquivo ? arquivo.name : null,
  });
  seErro(volta, error);
  atualizar();
}

export async function removerEvidencia(formData: FormData) {
  await requireOrg();
  const volta = String(formData.get("voltar") || PATH);
  const supabase = await createClient();
  const { error } = await supabase.from("action_evidences").delete().eq("id", String(formData.get("id")));
  seErro(volta, error);
  atualizar();
}
