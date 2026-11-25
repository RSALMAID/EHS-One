import { notFound } from "next/navigation";
import { cache } from "react";
import { requireOrg } from "./org";
import { createClient } from "./supabase/server";

/** Códigos dos módulos liberados para a empresa ativa (pelo plano e liberações extras). */
export const modulosLiberados = cache(async (orgId: string): Promise<string[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("enabled_modules", { org: orgId });
  if (error) {
    // Banco sem a migração 0007: não bloqueia o uso.
    console.error("Falha ao ler módulos liberados:", error);
    return ["*"];
  }
  return (data ?? []) as string[];
});

export function liberado(modulos: string[], codigo?: string) {
  return !codigo || modulos.includes("*") || modulos.includes(codigo);
}

/** Use no layout de cada módulo: fora do plano, a página não abre. */
export async function requireModule(codigo: string) {
  const org = await requireOrg();
  if (!liberado(await modulosLiberados(org.id), codigo)) notFound();
  return org;
}
