"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nomeArquivo } from "@/lib/acoes";
import { campo, seErro } from "@/lib/form";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const PATH = "/app/documentos";

function dados(formData: FormData) {
  return {
    title: campo(formData, "titulo"),
    category: String(formData.get("categoria") || "outro"),
    sector_id: campo(formData, "setor"),
    version: campo(formData, "versao"),
    issued_on: campo(formData, "emissao"),
    valid_until: campo(formData, "validade"),
    responsible: campo(formData, "responsavel"),
    notes: campo(formData, "obs"),
    visible_to_workers: formData.get("visivel") === "on",
  };
}

async function subirArquivo(orgId: string, docId: string, formData: FormData, volta: string) {
  const f = formData.get("arquivo");
  if (!(f instanceof File) || f.size === 0) return null;
  const supabase = await createClient();
  const caminho = `${orgId}/${docId}/${nomeArquivo(f.name)}`;
  const { error } = await supabase.storage.from("documentos").upload(caminho, f, { contentType: f.type });
  seErro(volta, error);
  return { file_path: caminho, file_name: f.name };
}

export async function criarDocumento(formData: FormData) {
  const org = await requireOrg();
  const d = dados(formData);
  if (!d.title) redirect(`${PATH}?erro=${encodeURIComponent("Dê um nome ao documento.")}`);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .insert({ ...d, organization_id: org.id })
    .select("id")
    .single();
  seErro(PATH, error);
  const arquivo = await subirArquivo(org.id, data!.id, formData, PATH);
  if (arquivo) {
    const { error: e2 } = await supabase.from("documents").update(arquivo).eq("id", data!.id);
    seErro(PATH, e2);
  }
  revalidatePath(PATH);
  redirect(`${PATH}?ok=1`);
}

export async function salvarDocumento(formData: FormData) {
  const org = await requireOrg();
  const id = String(formData.get("id"));
  const path = `${PATH}/${id}`;
  const d = dados(formData);
  if (!d.title) redirect(`${path}?erro=${encodeURIComponent("Dê um nome ao documento.")}`);
  const supabase = await createClient();
  const { data: antigo } = await supabase.from("documents").select("file_path").eq("id", id).maybeSingle();
  const arquivo = await subirArquivo(org.id, id, formData, path);
  const { error } = await supabase.from("documents").update({ ...d, ...(arquivo ?? {}) }).eq("id", id);
  seErro(path, error);
  // Arquivo trocado: apaga o anterior (a versão nova substitui).
  if (arquivo && antigo?.file_path) await supabase.storage.from("documentos").remove([antigo.file_path]);
  revalidatePath(PATH, "layout");
  redirect(`${path}?ok=1`);
}

export async function excluirDocumento(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("file_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("documents").delete().eq("id", id);
  seErro(`${PATH}/${id}`, error);
  if (doc?.file_path) await supabase.storage.from("documentos").remove([doc.file_path]);
  revalidatePath(PATH);
  redirect(PATH);
}
