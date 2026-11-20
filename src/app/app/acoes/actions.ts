"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export async function criarAcao(formData: FormData) {
  const org = await requireOrg();
  const problema = String(formData.get("problema") ?? "").trim();
  const acao = String(formData.get("acao") ?? "").trim();
  if (!problema || !acao) return;
  const supabase = await createClient();
  await supabase.from("actions").insert({
    organization_id: org.id,
    origin: String(formData.get("origem") ?? "outro"),
    problem: problema,
    action: acao,
    responsible_id: String(formData.get("responsavel") ?? "") || null,
    due_date: String(formData.get("prazo") ?? "") || null,
  });
  revalidatePath("/app/acoes");
  revalidatePath("/app");
}

export async function mudarStatus(formData: FormData) {
  await requireOrg();
  const supabase = await createClient();
  const status = String(formData.get("status"));
  await supabase
    .from("actions")
    .update({ status, closed_at: status === "concluida" ? new Date().toISOString() : null })
    .eq("id", String(formData.get("id")));
  revalidatePath("/app/acoes");
  revalidatePath("/app");
}
