"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export async function adicionarTrabalhador(formData: FormData) {
  const org = await requireOrg();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;
  const supabase = await createClient();
  await supabase.from("workers").insert({
    organization_id: org.id,
    full_name: nome,
    email: String(formData.get("email") ?? "").trim() || null,
    is_contractor: formData.get("terceiro") === "on",
  });
  revalidatePath("/app/trabalhadores");
}
