import { createClient } from "./supabase/server";

export type Plano = { code: string; name: string; description: string | null; price_label: string | null; sort: number; listed: boolean };
export type Modulo = { code: string; name: string; sort: number };

/** Catálogo: planos, módulos e quais módulos cada plano inclui. */
export async function catalogo() {
  const supabase = await createClient();
  const [{ data: planos }, { data: modulos }, { data: pm }] = await Promise.all([
    supabase.from("plans").select("*").order("sort"),
    supabase.from("modules").select("code, name, sort").order("sort"),
    supabase.from("plan_modules").select("plan, module_code"),
  ]);
  const inclui = new Set((pm ?? []).map((x) => `${x.plan}|${x.module_code}`));
  return {
    planos: (planos ?? []) as Plano[],
    modulos: (modulos ?? []) as Modulo[],
    inclui: (plano: string, modulo: string) => inclui.has(`${plano}|${modulo}`),
  };
}

export const STATUS_PEDIDO: Record<string, string> = {
  pendente: "Aguardando a equipe EHS One",
  atendido: "Atendido",
  cancelado: "Cancelado",
};
