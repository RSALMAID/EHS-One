"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { campo, seErro } from "@/lib/form";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const PATH = "/app/plano";

export async function pedirPlano(formData: FormData) {
  const org = await requireOrg();
  const plano = campo(formData, "plano");
  if (!plano) redirect(`${PATH}?erro=${encodeURIComponent("Escolha o plano.")}`);
  if (!["proprietario", "admin_ehs"].includes(org.role)) {
    redirect(`${PATH}?erro=${encodeURIComponent("Só o proprietário ou o administrador EHS pedem mudança de plano.")}`);
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("plan_requests").insert({
    organization_id: org.id,
    requested_plan: plano,
    note: campo(formData, "obs"),
    requested_by: user!.id,
  });
  seErro(PATH, error);
  revalidatePath(PATH);
  redirect(`${PATH}?ok=1`);
}
