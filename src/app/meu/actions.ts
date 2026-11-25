"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
