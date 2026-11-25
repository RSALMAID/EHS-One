"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nomeArquivo } from "@/lib/acoes";
import { campo, seErro } from "@/lib/form";
import { numeroEvento, TIPOS_EVENTO } from "@/lib/eventos";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const PATH = "/app/eventos";
const ev = (id: string) => `${PATH}/${id}`;

function nota(formData: FormData, nome: string): number | null {
  const n = Number(formData.get(nome));
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}
function inteiro(formData: FormData, nome: string): number | null {
  const v = String(formData.get(nome) ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : null;
}
function quando(formData: FormData): string | undefined {
  const v = campo(formData, "quando");
  // datetime-local vem sem fuso: interpreta como horário de Brasília
  return v ? new Date(`${v}:00-03:00`).toISOString() : undefined;
}

async function subirFotos(orgId: string, eventId: string, formData: FormData) {
  const supabase = await createClient();
  for (const f of formData.getAll("fotos")) {
    if (!(f instanceof File) || f.size === 0) continue;
    const caminho = `${orgId}/eventos/${eventId}/${nomeArquivo(f.name)}`;
    const { error } = await supabase.storage.from("evidencias").upload(caminho, f, { contentType: f.type });
    if (error) return error;
    const { error: e2 } = await supabase
      .from("event_files")
      .insert({ organization_id: orgId, event_id: eventId, file_path: caminho, file_name: f.name });
    if (e2) return e2;
  }
  return null;
}

/** Relato: usado pela Gestão e pelo Meu EHS. */
export async function relatarEvento(formData: FormData) {
  const org = await requireOrg();
  const volta = String(formData.get("voltar") || PATH);
  const descricao = campo(formData, "descricao");
  if (!descricao) redirect(`${volta}?erro=${encodeURIComponent("Conte o que aconteceu.")}`);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("events")
    .insert({
      organization_id: org.id,
      kind: String(formData.get("tipo")),
      occurred_at: quando(formData),
      sector_id: campo(formData, "setor"),
      location: campo(formData, "local"),
      description: descricao,
      immediate_action: campo(formData, "imediata"),
      hide_reporter: formData.get("ocultar") === "on",
      reported_by: user?.id,
    })
    .select("id")
    .single();
  seErro(volta, error);
  const e2 = await subirFotos(org.id, data!.id, formData);
  seErro(volta, e2);
  revalidatePath(PATH, "layout");
  revalidatePath("/meu", "layout");
  redirect(volta.startsWith("/meu") ? `${volta}?ok=1` : ev(data!.id));
}

export async function salvarEvento(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({
      kind: String(formData.get("tipo")),
      status,
      occurred_at: quando(formData),
      sector_id: campo(formData, "setor"),
      location: campo(formData, "local"),
      description: campo(formData, "descricao") ?? undefined,
      immediate_action: campo(formData, "imediata"),
      severity: nota(formData, "severidade"),
      probability: nota(formData, "probabilidade"),
      risk_type: campo(formData, "tipo_risco"),
      injured_worker_id: campo(formData, "acidentado"),
      injury_nature: campo(formData, "natureza"),
      body_part: campo(formData, "parte"),
      lost_days: inteiro(formData, "dias_perdidos"),
      debited_days: inteiro(formData, "dias_debitados"),
      cat_number: campo(formData, "cat"),
      env_aspect: campo(formData, "aspecto"),
      closed_at: status === "concluido" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  seErro(ev(id), error);
  revalidatePath(PATH, "layout");
}

export async function anexarFotos(formData: FormData) {
  const org = await requireOrg();
  const id = String(formData.get("id"));
  seErro(ev(id), await subirFotos(org.id, id, formData));
  revalidatePath(ev(id));
}

export async function salvarInvestigacao(formData: FormData) {
  const org = await requireOrg();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const concluir = formData.get("concluida") === "on";
  const { error } = await supabase.from("event_investigations").upsert({
    event_id: id,
    organization_id: org.id,
    method: String(formData.get("metodo")),
    team: campo(formData, "equipe"),
    summary: campo(formData, "conclusao"),
    concluded_at: concluir ? new Date().toISOString() : null,
  });
  seErro(ev(id), error);
  await supabase.from("events").update({ status: "em_investigacao" }).eq("id", id).in("status", ["relatado", "em_analise"]);
  revalidatePath(PATH, "layout");
}

export async function adicionarCausa(formData: FormData) {
  const org = await requireOrg();
  const id = String(formData.get("id"));
  const descricao = campo(formData, "descricao");
  if (!descricao) return;
  const supabase = await createClient();
  const { count } = await supabase.from("event_causes").select("id", { count: "exact", head: true }).eq("event_id", id);
  const { error } = await supabase.from("event_causes").insert({
    organization_id: org.id,
    event_id: id,
    parent_id: campo(formData, "pai"),
    category: campo(formData, "categoria"),
    description: descricao,
    is_root: formData.get("raiz") === "on",
    position: (count ?? 0) + 1,
  });
  seErro(ev(id), error);
  revalidatePath(ev(id));
}

export async function alternarRaiz(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("evento"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_causes")
    .update({ is_root: formData.get("raiz") !== "true" })
    .eq("id", String(formData.get("id")));
  seErro(ev(id), error);
  revalidatePath(ev(id));
}

export async function removerCausa(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("evento"));
  const supabase = await createClient();
  const { error } = await supabase.from("event_causes").delete().eq("id", String(formData.get("id")));
  seErro(ev(id), error);
  revalidatePath(ev(id));
}

/** Plano do evento (um por evento), criado na primeira ação. */
async function planoDoEvento(orgId: string, eventId: string) {
  const supabase = await createClient();
  const { data: existente } = await supabase
    .from("action_plans")
    .select("id")
    .eq("origin", "ocorrencia")
    .eq("origin_ref", eventId)
    .limit(1)
    .maybeSingle();
  if (existente) return existente.id as string;
  const { data: e } = await supabase.from("events").select("number, kind, description").eq("id", eventId).single();
  const { data, error } = await supabase
    .from("action_plans")
    .insert({
      organization_id: orgId,
      origin: "ocorrencia",
      origin_ref: eventId,
      title: `${numeroEvento(e!.number)} · ${TIPOS_EVENTO[e!.kind].nome}: ${e!.description.slice(0, 60)}`,
    })
    .select("id")
    .single();
  seErro(ev(eventId), error);
  return data!.id as string;
}

export async function criarAcaoEvento(formData: FormData) {
  const org = await requireOrg();
  const id = String(formData.get("evento"));
  const acao = campo(formData, "acao");
  if (!acao) redirect(`${ev(id)}?erro=${encodeURIComponent("Escreva a ação.")}`);
  const causa = campo(formData, "causa");
  const supabase = await createClient();
  const plano = await planoDoEvento(org.id, id);
  const { data, error } = await supabase
    .from("actions")
    .insert({
      organization_id: org.id,
      plan_id: plano,
      origin: "ocorrencia",
      origin_ref: id,
      problem: String(formData.get("problema") || "Causa do evento"),
      action: acao,
      responsible_id: campo(formData, "responsavel"),
      due_date: campo(formData, "prazo"),
    })
    .select("id")
    .single();
  seErro(ev(id), error);
  if (causa) await supabase.from("event_causes").update({ action_id: data!.id }).eq("id", causa);
  revalidatePath(ev(id));
  revalidatePath("/app/acoes", "layout");
}
