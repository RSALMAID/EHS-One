"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hoje, somarDias } from "@/lib/datas";
import { campo, seErro } from "@/lib/form";
import { requireOrg } from "@/lib/org";
import { AREAS_LEGAIS, ESFERAS, LISTA_BASICA, SITUACAO_LEGAL } from "@/lib/requisitos";
import { createClient } from "@/lib/supabase/server";

const PATH = "/app/requisitos";
const erro = (path: string, msg: string): never => redirect(`${path}?erro=${encodeURIComponent(msg)}`);
const pronto = (path: string) => {
  revalidatePath(PATH, "layout");
  redirect(path);
};

function dados(formData: FormData) {
  const area = String(formData.get("area"));
  const esfera = String(formData.get("esfera") || "federal");
  const meses = Number(formData.get("periodicidade") || 12);
  return {
    area: AREAS_LEGAIS[area] ? area : null,
    sphere: ESFERAS[esfera] ? esfera : "federal",
    source: campo(formData, "fonte"),
    title: campo(formData, "titulo"),
    requirement: campo(formData, "requisito"),
    sector_id: campo(formData, "setor"),
    responsible_id: campo(formData, "responsavel"),
    review_months: Number.isInteger(meses) && meses >= 1 && meses <= 60 ? meses : 12,
    notes: campo(formData, "obs"),
  };
}

export async function criarRequisito(formData: FormData) {
  const org = await requireOrg();
  const d = dados(formData);
  if (!d.area || !d.source || !d.title) erro(PATH, "Preencha a área, a fonte (lei ou norma) e o título.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("legal_requirements")
    .insert({ organization_id: org.id, ...d })
    .select("id")
    .single();
  seErro(PATH, error);
  pronto(`${PATH}/${data!.id}`);
}

/** Inclui a lista básica, pulando o que já existe (mesma fonte e título). */
export async function carregarListaBasica() {
  const org = await requireOrg();
  const supabase = await createClient();
  const { data: atuais } = await supabase.from("legal_requirements").select("source, title").eq("organization_id", org.id);
  const tem = new Set((atuais ?? []).map((r) => `${r.source}|${r.title}`));
  const novos = LISTA_BASICA.filter((r) => !tem.has(`${r.source}|${r.title}`)).map((r) => ({
    organization_id: org.id,
    ...r,
  }));
  if (novos.length) {
    const { error } = await supabase.from("legal_requirements").insert(novos);
    seErro(PATH, error);
  }
  pronto(`${PATH}?ok=${novos.length}`);
}

export async function salvarRequisito(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const path = `${PATH}/${id}`;
  const d = dados(formData);
  if (!d.area || !d.source || !d.title) erro(path, "Preencha a área, a fonte (lei ou norma) e o título.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("legal_requirements")
    .update({ ...d, applicable: formData.get("aplicavel") === "on" })
    .eq("id", id);
  seErro(path, error);
  pronto(`${path}?ok=1`);
}

export async function excluirRequisito(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("legal_requirements").delete().eq("id", id);
  seErro(`${PATH}/${id}`, error);
  pronto(PATH);
}

/** Registra a avaliação de atendimento; se não atende (total ou parcial), pode abrir uma ação. */
export async function avaliarRequisito(formData: FormData) {
  const org = await requireOrg();
  const id = String(formData.get("id"));
  const path = `${PATH}/${id}`;
  const situacao = String(formData.get("situacao"));
  if (!SITUACAO_LEGAL[situacao] || situacao === "nao_avaliado") erro(path, "Escolha se o requisito é atendido.");
  const supabase = await createClient();
  let acao: string | null = null;
  if (situacao !== "atende" && formData.get("abrir_acao") === "on") {
    const { data: r } = await supabase
      .from("legal_requirements")
      .select("source, title, responsible_id")
      .eq("id", id)
      .maybeSingle();
    const { data: a, error } = await supabase
      .from("actions")
      .insert({
        organization_id: org.id,
        origin: "requisito_legal",
        origin_ref: id,
        problem: `${r?.source ?? ""} · ${r?.title ?? ""}: ${campo(formData, "evidencia") ?? "requisito não atendido"}`,
        action: campo(formData, "acao") ?? "Adequar a empresa ao requisito legal",
        responsible_id: r?.responsible_id ?? null,
        due_date: campo(formData, "prazo") ?? somarDias(hoje(), 30),
      })
      .select("id")
      .single();
    seErro(path, error);
    acao = a!.id;
  }
  const { error } = await supabase.from("legal_evaluations").insert({
    organization_id: org.id,
    requirement_id: id,
    evaluated_on: campo(formData, "data") ?? undefined,
    status: situacao,
    evidence: campo(formData, "evidencia"),
    evaluator: campo(formData, "avaliador"),
    action_id: acao,
  });
  seErro(path, error);
  if (acao) revalidatePath("/app/acoes", "layout");
  pronto(`${path}?ok=${acao ? "acao" : "1"}`);
}

export async function removerAvaliacao(formData: FormData) {
  await requireOrg();
  const path = `${PATH}/${String(formData.get("requisito"))}`;
  const supabase = await createClient();
  const { error } = await supabase.from("legal_evaluations").delete().eq("id", String(formData.get("id")));
  seErro(path, error);
  pronto(path);
}
