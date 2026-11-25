"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { campo, seErro } from "@/lib/form";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const PATH = "/app/dds";

export async function criarDds(formData: FormData) {
  const org = await requireOrg();
  const titulo = campo(formData, "titulo");
  if (!titulo) redirect(`${PATH}?erro=${encodeURIComponent("Dê um tema para o DDS.")}`);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dds_talks")
    .insert({
      organization_id: org.id,
      title: titulo,
      content: campo(formData, "conteudo"),
      held_on: campo(formData, "data") ?? undefined,
      sector_id: campo(formData, "setor"),
      facilitator: campo(formData, "facilitador"),
    })
    .select("id, sector_id")
    .single();
  seErro(PATH, error);
  // Já inclui o pessoal do setor escolhido.
  if (data!.sector_id) await incluirSetor(org.id, data!.id, data!.sector_id);
  revalidatePath(PATH);
  redirect(`${PATH}/${data!.id}`);
}

async function incluirSetor(orgId: string, talkId: string, setor: string | null) {
  const supabase = await createClient();
  let q = supabase.from("workers").select("id").eq("organization_id", orgId).eq("active", true);
  if (setor) q = q.eq("sector_id", setor);
  const { data } = await q;
  if (!data?.length) return null;
  const { error } = await supabase
    .from("dds_attendances")
    .upsert(
      data.map((w) => ({ organization_id: orgId, talk_id: talkId, worker_id: w.id })),
      { onConflict: "talk_id,worker_id", ignoreDuplicates: true },
    );
  return error;
}

export async function adicionarParticipantes(formData: FormData) {
  const org = await requireOrg();
  const id = String(formData.get("id"));
  const path = `${PATH}/${id}`;
  const supabase = await createClient();
  const trabalhador = campo(formData, "trabalhador");
  if (trabalhador) {
    const { error } = await supabase
      .from("dds_attendances")
      .upsert({ organization_id: org.id, talk_id: id, worker_id: trabalhador }, { onConflict: "talk_id,worker_id", ignoreDuplicates: true });
    seErro(path, error);
  } else {
    const setor = campo(formData, "setor");
    seErro(path, await incluirSetor(org.id, id, setor === "todos" ? null : setor));
  }
  revalidatePath(path);
}

/** Presença marcada pela equipe (quem não tem celular ou login). */
export async function marcarPresenca(formData: FormData) {
  await requireOrg();
  const path = `${PATH}/${String(formData.get("dds"))}`;
  const presente = formData.get("presente") === "1";
  const supabase = await createClient();
  const { error } = await supabase
    .from("dds_attendances")
    .update({ confirmed_at: presente ? new Date().toISOString() : null, confirmed_device: presente ? "marcado pela equipe" : null })
    .eq("id", String(formData.get("id")));
  seErro(path, error);
  revalidatePath(path);
}

export async function removerParticipante(formData: FormData) {
  await requireOrg();
  const path = `${PATH}/${String(formData.get("dds"))}`;
  const supabase = await createClient();
  const { error } = await supabase.from("dds_attendances").delete().eq("id", String(formData.get("id")));
  seErro(path, error);
  revalidatePath(path);
}

export async function mudarStatusDds(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("dds_talks")
    .update({ status: formData.get("status") === "aberto" ? "aberto" : "encerrado" })
    .eq("id", id);
  seErro(`${PATH}/${id}`, error);
  revalidatePath(`${PATH}/${id}`);
}

export async function excluirDds(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("dds_talks").delete().eq("id", id);
  seErro(`${PATH}/${id}`, error);
  revalidatePath(PATH);
  redirect(PATH);
}

/* ---------------- Comunicados ---------------- */

export async function publicarComunicado(formData: FormData) {
  const org = await requireOrg();
  const titulo = campo(formData, "titulo");
  const texto = campo(formData, "texto");
  if (!titulo || !texto) redirect(`/app/comunicados?erro=${encodeURIComponent("Preencha o título e o texto.")}`);
  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .insert({ organization_id: org.id, title: titulo, body: texto, expires_on: campo(formData, "ate") });
  seErro("/app/comunicados", error);
  revalidatePath("/app/comunicados");
  revalidatePath("/meu");
}

export async function excluirComunicado(formData: FormData) {
  await requireOrg();
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", String(formData.get("id")));
  seErro("/app/comunicados", error);
  revalidatePath("/app/comunicados");
  revalidatePath("/meu");
}
