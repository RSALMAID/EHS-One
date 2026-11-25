"use server";

import { revalidatePath } from "next/cache";
import { campo, seErro } from "@/lib/form";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const PATH = "/app/empresa";

export async function salvarEmpresa(formData: FormData) {
  const org = await requireOrg();
  const supabase = await createClient();
  const n = Number(formData.get("funcionarios"));
  const { error } = await supabase
    .from("organizations")
    .update({
      name: campo(formData, "nome") ?? org.name,
      cnpj: campo(formData, "cnpj"),
      segment: campo(formData, "segmento"),
      employee_count: Number.isFinite(n) && n > 0 ? n : null,
    })
    .eq("id", org.id);
  seErro(PATH, error);
  revalidatePath("/app", "layout");
}

export async function adicionarUnidade(formData: FormData) {
  const org = await requireOrg();
  const nome = campo(formData, "nome");
  if (!nome) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("units")
    .insert({ organization_id: org.id, name: nome, address: campo(formData, "endereco") });
  seErro(PATH, error);
  revalidatePath(PATH);
}

export async function removerUnidade(formData: FormData) {
  await requireOrg();
  const supabase = await createClient();
  const { error } = await supabase.from("units").delete().eq("id", String(formData.get("id")));
  seErro(PATH, error);
  revalidatePath(PATH);
}
