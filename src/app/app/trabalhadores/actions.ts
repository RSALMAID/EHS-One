"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { campo, seErro } from "@/lib/form";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const PATH = "/app/trabalhadores";

export async function adicionarTrabalhador(formData: FormData) {
  const org = await requireOrg();
  const nome = campo(formData, "nome");
  if (!nome) return;
  const supabase = await createClient();
  const { error } = await supabase.from("workers").insert({
    organization_id: org.id,
    full_name: nome,
    email: campo(formData, "email"),
    sector_id: campo(formData, "setor"),
    job_role_id: campo(formData, "cargo"),
    is_contractor: formData.get("terceiro") === "on",
  });
  seErro(PATH, error);
  revalidatePath(PATH);
}

export async function atualizarVinculo(formData: FormData) {
  await requireOrg();
  const supabase = await createClient();
  const { error } = await supabase
    .from("workers")
    .update({
      email: campo(formData, "email"),
      sector_id: campo(formData, "setor"),
      job_role_id: campo(formData, "cargo"),
      active: formData.get("ativo") === "on",
    })
    .eq("id", String(formData.get("id")));
  seErro(PATH, error);
  revalidatePath(PATH);
}

/** Convida o trabalhador para o Meu EHS: quando ele criar a conta com este e-mail, o login fica ligado à ficha. */
export async function convidar(formData: FormData) {
  const org = await requireOrg();
  const supabase = await createClient();
  const { data: w } = await supabase
    .from("workers")
    .select("id, email")
    .eq("id", String(formData.get("id")))
    .maybeSingle();
  if (!w?.email) {
    redirect(`${PATH}?erro=${encodeURIComponent("Cadastre o e-mail do trabalhador antes de convidar.")}`);
  }
  const { error } = await supabase
    .from("invitations")
    .insert({ organization_id: org.id, email: w.email.toLowerCase(), worker_id: w.id, role: "trabalhador" });
  if (error?.code === "23505") {
    redirect(`${PATH}?erro=${encodeURIComponent("Já existe um convite pendente para este e-mail.")}`);
  }
  seErro(PATH, error);
  revalidatePath(PATH);
}

export async function cancelarConvite(formData: FormData) {
  await requireOrg();
  const supabase = await createClient();
  const { error } = await supabase.from("invitations").delete().eq("id", String(formData.get("id")));
  seErro(PATH, error);
  revalidatePath(PATH);
}
