"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/app";
}

export async function entrar(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("senha") ?? ""),
  });
  if (error) redirect(`/entrar?erro=${encodeURIComponent("E-mail ou senha inválidos.")}`);
  redirect(safeNext(formData.get("next")));
}

export async function cadastrar(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("senha") ?? ""),
  });
  if (error) {
    redirect(`/entrar?modo=cadastro&erro=${encodeURIComponent(error.message)}`);
  }
  if (!data.session) {
    redirect(
      `/entrar?aviso=${encodeURIComponent("Enviamos um link de confirmação para o seu e-mail.")}`,
    );
  }
  redirect("/onboarding");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
