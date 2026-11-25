"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACESSO_COOKIE, codigoAcesso, hashCodigo } from "@/lib/acesso";

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function liberarAcesso(formData: FormData) {
  const esperado = codigoAcesso();
  const next = safeNext(formData.get("next"));
  if (!esperado) redirect(next);

  const digitado = String(formData.get("codigo") ?? "");
  const [a, b] = await Promise.all([hashCodigo(digitado), hashCodigo(esperado)]);
  if (a !== b) {
    redirect(`/acesso?erro=1&next=${encodeURIComponent(next)}`);
  }

  const store = await cookies();
  store.set(ACESSO_COOKIE, b, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(next);
}
