"use server";

import { revalidatePath } from "next/cache";
import { campo, seErro } from "@/lib/form";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const PATH = "/app/cargos";

export async function adicionarCargo(formData: FormData) {
  const org = await requireOrg();
  const nome = campo(formData, "nome");
  if (!nome) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("job_roles")
    .insert({ organization_id: org.id, name: nome, description: campo(formData, "descricao") });
  seErro(PATH, error);
  revalidatePath(PATH);
}

export async function removerCargo(formData: FormData) {
  await requireOrg();
  const supabase = await createClient();
  const { error } = await supabase.from("job_roles").delete().eq("id", String(formData.get("id")));
  seErro(PATH, error);
  revalidatePath(PATH);
}
