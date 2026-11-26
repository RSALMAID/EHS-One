"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { campo, seErro } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

const PATH = "/admin";

export async function mudarPlano(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_plan", {
    p_org: String(formData.get("org")),
    p_plan: String(formData.get("plano")),
    p_trial_ends: campo(formData, "teste_ate"),
  });
  seErro(PATH, error);
  revalidatePath("/", "layout");
  redirect(`${PATH}?ok=1`);
}

/** Cada módulo: "plano" (segue o plano), "liberar" (extra) ou "tirar". */
export async function salvarModulos(formData: FormData) {
  const supabase = await createClient();
  const org = String(formData.get("org"));
  for (const [chave, valor] of formData.entries()) {
    if (!chave.startsWith("m_")) continue;
    const anterior = String(formData.get(`a_${chave.slice(2)}`) ?? "plano");
    if (valor === anterior) continue;
    const { error } = await supabase.rpc("admin_set_module", {
      p_org: org,
      p_module: chave.slice(2),
      p_enabled: valor === "liberar" ? true : valor === "tirar" ? false : null,
    });
    seErro(PATH, error);
  }
  revalidatePath("/", "layout");
  redirect(`${PATH}?ok=1`);
}

export async function responderPedido(formData: FormData) {
  const supabase = await createClient();
  const status = formData.get("status") === "cancelado" ? "cancelado" : "atendido";
  const { error } = await supabase
    .from("plan_requests")
    .update({ status, answer: campo(formData, "resposta") })
    .eq("id", String(formData.get("id")));
  seErro(PATH, error);
  revalidatePath(PATH);
  redirect(`${PATH}?ok=1`);
}
