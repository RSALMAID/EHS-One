"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CARGOS_SESMT } from "@/lib/cipa";
import { campo, seErro } from "@/lib/form";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const PATH = "/app/sesmt";

function horas(formData: FormData) {
  const v = String(formData.get("horas") ?? "").trim().replace(",", ".");
  const n = Number(v);
  return v && Number.isFinite(n) && n > 0 ? n : null;
}

export async function adicionarSesmt(formData: FormData) {
  const org = await requireOrg();
  const supabase = await createClient();
  const trabalhador = campo(formData, "trabalhador");
  let nome = campo(formData, "nome");
  if (!nome && trabalhador) {
    const { data } = await supabase.from("workers").select("full_name").eq("id", trabalhador).maybeSingle();
    nome = data?.full_name ?? null;
  }
  const cargo = String(formData.get("cargo"));
  if (!nome || !CARGOS_SESMT[cargo]) redirect(`${PATH}?erro=${encodeURIComponent("Informe o nome e a função.")}`);
  const { error } = await supabase.from("sesmt_members").insert({
    organization_id: org.id,
    worker_id: trabalhador,
    name: nome,
    role: cargo,
    registration: campo(formData, "registro"),
    hours_per_week: horas(formData),
    starts_on: campo(formData, "inicio"),
  });
  seErro(PATH, error);
  revalidatePath(PATH);
  redirect(PATH);
}

export async function salvarSesmt(formData: FormData) {
  await requireOrg();
  const supabase = await createClient();
  const { error } = await supabase
    .from("sesmt_members")
    .update({
      registration: campo(formData, "registro"),
      hours_per_week: horas(formData),
      starts_on: campo(formData, "inicio"),
      ends_on: campo(formData, "fim"),
    })
    .eq("id", String(formData.get("id")));
  seErro(PATH, error);
  revalidatePath(PATH);
  redirect(PATH);
}

export async function removerSesmt(formData: FormData) {
  await requireOrg();
  const supabase = await createClient();
  const { error } = await supabase.from("sesmt_members").delete().eq("id", String(formData.get("id")));
  seErro(PATH, error);
  revalidatePath(PATH);
  redirect(PATH);
}
