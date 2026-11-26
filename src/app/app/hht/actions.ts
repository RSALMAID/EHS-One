"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { campo, seErro } from "@/lib/form";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const PATH = "/app/hht";

export async function salvarHht(formData: FormData) {
  const org = await requireOrg();
  const mes = campo(formData, "mes"); // AAAA-MM
  const pessoas = Number(formData.get("trabalhadores"));
  const horas = Number(String(formData.get("horas") ?? "").replace(/\./g, "").replace(",", "."));
  if (!mes || !/^\d{4}-\d{2}$/.test(mes) || !Number.isInteger(pessoas) || pessoas < 0 || !Number.isFinite(horas) || horas < 0) {
    redirect(`${PATH}?erro=${encodeURIComponent("Preencha o mês, o número de trabalhadores e as horas trabalhadas.")}`);
  }
  const supabase = await createClient();
  const { error } = await supabase.from("hht_records").upsert(
    {
      organization_id: org.id,
      month: `${mes}-01`,
      workers_count: pessoas,
      hours_worked: horas,
      notes: campo(formData, "obs"),
    },
    { onConflict: "organization_id,month" },
  );
  seErro(PATH, error);
  revalidatePath(PATH);
  revalidatePath("/painel");
}

export async function removerHht(formData: FormData) {
  await requireOrg();
  const supabase = await createClient();
  const { error } = await supabase.from("hht_records").delete().eq("id", String(formData.get("id")));
  seErro(PATH, error);
  revalidatePath(PATH);
  revalidatePath("/painel");
}
