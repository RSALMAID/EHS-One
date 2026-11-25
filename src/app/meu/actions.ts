"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { nomeArquivo } from "@/lib/acoes";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export async function confirmarEpi(formData: FormData) {
  await requireOrg();
  if (formData.get("declaro") !== "on") {
    redirect(`/meu/epis?erro=${encodeURIComponent("Marque a declaração para confirmar.")}`);
  }
  const supabase = await createClient();
  const aparelho = (await headers()).get("user-agent");
  const { data, error } = await supabase.rpc("confirm_ppe_delivery", {
    p_id: String(formData.get("id")),
    p_device: aparelho,
  });
  if (error || !data) {
    redirect(`/meu/epis?erro=${encodeURIComponent(error?.message ?? "Não foi possível confirmar esta entrega.")}`);
  }
  revalidatePath("/meu", "layout");
  redirect("/meu/epis?ok=1");
}

/** O responsável conta o que fez (texto e/ou foto) e manda a ação para validação. */
export async function enviarAcao(formData: FormData) {
  const org = await requireOrg();
  const id = String(formData.get("id"));
  const nota = String(formData.get("nota") ?? "").trim();
  const arquivo = formData.get("foto");
  const supabase = await createClient();
  if (arquivo instanceof File && arquivo.size > 0) {
    const caminho = `${org.id}/${id}/${nomeArquivo(arquivo.name)}`;
    const { error } = await supabase.storage.from("evidencias").upload(caminho, arquivo, { contentType: arquivo.type });
    if (error) redirect(`/meu/acoes?erro=${encodeURIComponent(`Falha ao enviar a foto: ${error.message}`)}`);
    await supabase
      .from("action_evidences")
      .insert({ organization_id: org.id, action_id: id, file_path: caminho, file_name: arquivo.name });
  }
  const { data, error } = await supabase.rpc("submit_action", { p_id: id, p_note: nota || null });
  if (error || !data) {
    redirect(`/meu/acoes?erro=${encodeURIComponent(error?.message ?? "Não foi possível enviar esta ação.")}`);
  }
  revalidatePath("/meu", "layout");
  revalidatePath("/app/acoes", "layout");
  redirect("/meu/acoes?ok=1");
}
