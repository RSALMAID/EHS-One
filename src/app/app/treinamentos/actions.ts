"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { campo, seErro } from "@/lib/form";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const PATH = "/app/treinamentos";

function positivo(formData: FormData, nome: string): number | null {
  const n = Number(String(formData.get(nome) ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function dados(formData: FormData) {
  const meses = positivo(formData, "validade");
  return {
    name: campo(formData, "nome"),
    norm_reference: campo(formData, "nr"),
    workload_hours: positivo(formData, "carga"),
    validity_months: meses ? Math.round(meses) : null,
    syllabus: campo(formData, "conteudo"),
  };
}

export async function adicionarTreinamento(formData: FormData) {
  const org = await requireOrg();
  const d = dados(formData);
  if (!d.name) return;
  const supabase = await createClient();
  const { error } = await supabase.from("trainings").insert({ ...d, organization_id: org.id });
  seErro(PATH, error);
  revalidatePath(PATH);
}

export async function salvarTreinamento(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const path = `${PATH}/${id}`;
  const d = dados(formData);
  if (!d.name) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("trainings")
    .update({ ...d, active: formData.get("ativo") === "on" })
    .eq("id", id);
  seErro(path, error);
  revalidatePath(path);
}

export async function salvarCargosExigidos(formData: FormData) {
  const org = await requireOrg();
  const id = String(formData.get("id"));
  const path = `${PATH}/${id}`;
  const cargos = formData.getAll("cargos").map(String);
  const supabase = await createClient();
  const { error: e1 } = await supabase.from("training_job_roles").delete().eq("training_id", id);
  seErro(path, e1);
  if (cargos.length) {
    const { error } = await supabase
      .from("training_job_roles")
      .insert(cargos.map((c) => ({ training_id: id, job_role_id: c, organization_id: org.id })));
    seErro(path, error);
  }
  revalidatePath(PATH, "layout");
}

export async function removerTreinamento(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("trainings").delete().eq("id", id);
  if (error?.code === "23503") {
    redirect(
      `${PATH}/${id}?erro=${encodeURIComponent("Este treinamento já tem turmas e não pode ser excluído. Desmarque “Em uso”.")}`,
    );
  }
  seErro(`${PATH}/${id}`, error);
  revalidatePath(PATH);
  redirect(PATH);
}

export async function criarTurma(formData: FormData) {
  const org = await requireOrg();
  const treinamento = String(formData.get("treinamento"));
  const data = campo(formData, "data");
  const path = `${PATH}/${treinamento}`;
  if (!data) redirect(`${path}?erro=${encodeURIComponent("Informe a data da turma.")}`);
  const supabase = await createClient();
  const { data: turma, error } = await supabase
    .from("training_sessions")
    .insert({
      organization_id: org.id,
      training_id: treinamento,
      held_on: data,
      instructor: campo(formData, "instrutor"),
      location: campo(formData, "local"),
      notes: campo(formData, "obs"),
    })
    .select("id")
    .single();
  seErro(path, error);
  redirect(`${PATH}/turma/${turma!.id}`);
}

export async function removerTurma(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const treinamento = String(formData.get("treinamento"));
  const supabase = await createClient();
  const { error } = await supabase.from("training_sessions").delete().eq("id", id);
  if (error?.code === "23503") {
    redirect(
      `${PATH}/turma/${id}?erro=${encodeURIComponent("Retire os participantes antes de excluir a turma.")}`,
    );
  }
  seErro(`${PATH}/turma/${id}`, error);
  revalidatePath(PATH, "layout");
  redirect(`${PATH}/${treinamento}`);
}

export async function adicionarParticipantes(formData: FormData) {
  const org = await requireOrg();
  const turma = String(formData.get("turma"));
  const path = `${PATH}/turma/${turma}`;
  const trabalhadores = formData.getAll("trabalhadores").map(String);
  if (!trabalhadores.length) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("training_attendances")
    .upsert(
      trabalhadores.map((w) => ({ organization_id: org.id, session_id: turma, worker_id: w })),
      { onConflict: "session_id,worker_id", ignoreDuplicates: true },
    );
  seErro(path, error);
  revalidatePath(PATH, "layout");
}

export async function alternarAprovacao(formData: FormData) {
  await requireOrg();
  const turma = String(formData.get("turma"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("training_attendances")
    .update({ approved: formData.get("aprovado") !== "true" })
    .eq("id", String(formData.get("id")));
  seErro(`${PATH}/turma/${turma}`, error);
  revalidatePath(PATH, "layout");
}

export async function removerParticipante(formData: FormData) {
  await requireOrg();
  const turma = String(formData.get("turma"));
  const supabase = await createClient();
  const { error } = await supabase.from("training_attendances").delete().eq("id", String(formData.get("id")));
  seErro(`${PATH}/turma/${turma}`, error);
  revalidatePath(PATH, "layout");
}

export async function criarAcaoTreinamento(formData: FormData) {
  const org = await requireOrg();
  const supabase = await createClient();
  const { error } = await supabase.from("actions").insert({
    organization_id: org.id,
    origin: "treinamento",
    origin_ref: campo(formData, "treinamento"),
    problem: String(formData.get("problema")),
    action: String(formData.get("acao")),
    due_date: campo(formData, "prazo"),
  });
  seErro(`${PATH}/pendencias`, error);
  revalidatePath("/app/acoes");
  redirect("/app/acoes");
}
