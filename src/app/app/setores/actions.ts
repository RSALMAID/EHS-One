"use server";

import { revalidatePath } from "next/cache";
import { campo, seErro } from "@/lib/form";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const PATH = "/app/setores";

export async function adicionarSetor(formData: FormData) {
  const org = await requireOrg();
  const nome = campo(formData, "nome");
  const unidade = campo(formData, "unidade");
  if (!nome || !unidade) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("sectors")
    .insert({ organization_id: org.id, unit_id: unidade, name: nome });
  seErro(PATH, error);
  revalidatePath(PATH);
}

export async function removerSetor(formData: FormData) {
  await requireOrg();
  const supabase = await createClient();
  const { error } = await supabase.from("sectors").delete().eq("id", String(formData.get("id")));
  seErro(PATH, error);
  revalidatePath(PATH);
}
