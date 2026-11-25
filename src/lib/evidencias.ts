import type { Evidencia } from "@/components/AcaoCard";
import { createClient } from "./supabase/server";

/** Evidências das ações, já com link temporário (1 h) para os arquivos. */
export async function evidenciasDe(acoes: string[]): Promise<Evidencia[]> {
  if (!acoes.length) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("action_evidences")
    .select("id, action_id, note, file_name, file_path, created_at")
    .in("action_id", acoes)
    .order("created_at");
  const lista = data ?? [];
  const caminhos = lista.map((e) => e.file_path).filter(Boolean) as string[];
  const urls = new Map<string, string>();
  if (caminhos.length) {
    const { data: assinadas } = await supabase.storage.from("evidencias").createSignedUrls(caminhos, 3600);
    for (const s of assinadas ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  return lista.map((e) => ({ ...e, url: e.file_path ? urls.get(e.file_path) ?? null : null }));
}
