"use server";

import { revalidatePath } from "next/cache";
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
      sector_id: campo(formData, "setor"),
      job_role_id: campo(formData, "cargo"),
      active: formData.get("ativo") === "on",
    })
    .eq("id", String(formData.get("id")));
  seErro(PATH, error);
  revalidatePath(PATH);
}
