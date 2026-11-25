"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function criarEmpresa(formData: FormData) {
  const supabase = await createClient();
  const funcionarios = Number(formData.get("funcionarios"));
  const { error } = await supabase.rpc("create_organization", {
    p_name: String(formData.get("nome") ?? "").trim(),
    p_cnpj: String(formData.get("cnpj") ?? ""),
    p_segment: String(formData.get("segmento") ?? ""),
    p_employee_count: Number.isFinite(funcionarios) && funcionarios > 0 ? funcionarios : null,
  });
  if (error) {
    console.error("Falha ao criar a empresa:", error);
    redirect(
      `/onboarding?erro=${encodeURIComponent(`Não foi possível criar a empresa: ${error.message}`)}`,
    );
  }
  redirect("/app");
}
