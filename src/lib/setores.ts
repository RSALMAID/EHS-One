import { createClient } from "./supabase/server";

/** Setores com o nome da unidade, para selects. */
export async function opcoesSetor(orgId: string) {
  const supabase = await createClient();
  const [{ data: setores }, { data: unidades }] = await Promise.all([
    supabase.from("sectors").select("id, name, unit_id").eq("organization_id", orgId).order("name"),
    supabase.from("units").select("id, name").eq("organization_id", orgId),
  ]);
  return (setores ?? []).map((s) => ({
    id: s.id,
    label: `${s.name} (${unidades?.find((u) => u.id === s.unit_id)?.name ?? ""})`,
  }));
}
