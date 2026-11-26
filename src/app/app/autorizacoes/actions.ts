"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nomeArquivo } from "@/lib/acoes";
import { TIPOS_AUTORIZACAO, TIPOS_EVIDENCIA } from "@/lib/autorizacoes";
import { hoje } from "@/lib/datas";
import { campo, seErro } from "@/lib/form";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const PATH = "/app/autorizacoes";
const BUCKET = "capacitacoes";
const erro = (path: string, msg: string): never => redirect(`${path}?erro=${encodeURIComponent(msg)}`);

function arquivo(formData: FormData) {
  const f = formData.get("arquivo");
  return f instanceof File && f.size > 0 ? f : null;
}

async function subir(caminho: string, f: File, volta: string) {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, f, { contentType: f.type });
  seErro(volta, error);
}

/* ---------------- Autorizações ---------------- */

export async function criarAutorizacao(formData: FormData) {
  const org = await requireOrg();
  const trabalhador = campo(formData, "trabalhador");
  const tipo = String(formData.get("tipo"));
  const outra = campo(formData, "outra");
  const kind = tipo === "outra" ? outra : tipo;
  if (!trabalhador || !TIPOS_AUTORIZACAO[tipo] || !kind) erro(PATH, "Escolha a pessoa e o tipo de autorização.");
  const emissao = campo(formData, "emissao") ?? hoje();
  const validade = campo(formData, "validade");
  if (validade && validade < emissao) erro(PATH, "A validade precisa ser depois da emissão.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_authorizations")
    .insert({
      organization_id: org.id,
      worker_id: trabalhador,
      kind,
      scope: campo(formData, "escopo"),
      training_id: campo(formData, "treinamento"),
      issued_on: emissao,
      valid_until: validade,
      issued_by: campo(formData, "emitente"),
      notes: campo(formData, "obs"),
    })
    .select("id")
    .single();
  seErro(PATH, error);
  const f = arquivo(formData);
  if (f) {
    const caminho = `${org.id}/autorizacoes/${data!.id}/${nomeArquivo(f.name)}`;
    await subir(caminho, f, PATH);
    const { error: e2 } = await supabase
      .from("work_authorizations")
      .update({ file_path: caminho, file_name: f.name })
      .eq("id", data!.id);
    seErro(PATH, e2);
  }
  revalidatePath(PATH);
  redirect(`${PATH}?ok=1`);
}

/** Renova: nova validade e, se vier, novo documento assinado. */
export async function renovarAutorizacao(formData: FormData) {
  const org = await requireOrg();
  const id = String(formData.get("id"));
  const validade = campo(formData, "validade");
  const supabase = await createClient();
  const { data: atual } = await supabase.from("work_authorizations").select("file_path").eq("id", id).maybeSingle();
  const mudancas: Record<string, string | null> = { issued_on: hoje(), valid_until: validade };
  const f = arquivo(formData);
  if (f) {
    const caminho = `${org.id}/autorizacoes/${id}/${nomeArquivo(f.name)}`;
    await subir(caminho, f, PATH);
    mudancas.file_path = caminho;
    mudancas.file_name = f.name;
  }
  const { error } = await supabase.from("work_authorizations").update(mudancas).eq("id", id);
  seErro(PATH, error);
  if (f && atual?.file_path) await supabase.storage.from(BUCKET).remove([atual.file_path]);
  revalidatePath(PATH);
  redirect(`${PATH}?ok=1`);
}

export async function revogarAutorizacao(formData: FormData) {
  await requireOrg();
  const motivo = campo(formData, "motivo");
  if (!motivo) erro(PATH, "Diga o motivo da revogação.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("work_authorizations")
    .update({ revoked_on: hoje(), revoked_reason: motivo })
    .eq("id", String(formData.get("id")));
  seErro(PATH, error);
  revalidatePath(PATH);
  redirect(PATH);
}

export async function excluirAutorizacao(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { data: a } = await supabase.from("work_authorizations").select("file_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("work_authorizations").delete().eq("id", id);
  seErro(PATH, error);
  if (a?.file_path) await supabase.storage.from(BUCKET).remove([a.file_path]);
  revalidatePath(PATH);
  redirect(PATH);
}

/* ---------------- Evidências das turmas ---------------- */

export async function adicionarEvidencia(formData: FormData) {
  const org = await requireOrg();
  const turma = String(formData.get("turma"));
  const volta = `/app/treinamentos/turma/${turma}`;
  const f = arquivo(formData);
  const tipo = String(formData.get("tipo") || "outro");
  if (!f) erro(volta, "Escolha o arquivo.");
  if (!TIPOS_EVIDENCIA[tipo]) erro(volta, "Escolha o tipo de evidência.");
  const caminho = `${org.id}/turmas/${turma}/${nomeArquivo(f!.name)}`;
  await subir(caminho, f!, volta);
  const supabase = await createClient();
  const { error } = await supabase.from("training_evidences").insert({
    organization_id: org.id,
    session_id: turma,
    worker_id: tipo === "certificado" ? campo(formData, "trabalhador") : null,
    kind: tipo,
    file_path: caminho,
    file_name: f!.name,
    notes: campo(formData, "obs"),
  });
  if (error) await supabase.storage.from(BUCKET).remove([caminho]);
  seErro(volta, error);
  revalidatePath(volta);
  redirect(volta);
}

export async function removerEvidencia(formData: FormData) {
  await requireOrg();
  const volta = `/app/treinamentos/turma/${String(formData.get("turma"))}`;
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { data: e } = await supabase.from("training_evidences").select("file_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("training_evidences").delete().eq("id", id);
  seErro(volta, error);
  if (e?.file_path) await supabase.storage.from(BUCKET).remove([e.file_path]);
  revalidatePath(volta);
  redirect(volta);
}
