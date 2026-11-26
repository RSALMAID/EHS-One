"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dataBR, hoje, somarDias } from "@/lib/datas";
import { campo, seErro } from "@/lib/form";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const PATH = "/app/cipa";
const erro = (path: string, msg: string): never => redirect(`${path}?erro=${encodeURIComponent(msg)}`);
const pronto = (path: string) => {
  revalidatePath(PATH, "layout");
  redirect(path);
};

/* ---------------- Gestões ---------------- */

export async function criarGestao(formData: FormData) {
  const org = await requireOrg();
  const nome = campo(formData, "nome");
  const inicio = campo(formData, "inicio");
  const fim = campo(formData, "fim");
  if (!nome || !inicio || !fim) erro(PATH, "Preencha o nome, o início e o fim do mandato.");
  if (fim! <= inicio!) erro(PATH, "O fim do mandato precisa ser depois do início.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cipa_mandates")
    .insert({
      organization_id: org.id,
      name: nome,
      unit_id: campo(formData, "unidade"),
      starts_on: inicio,
      ends_on: fim,
      election_on: campo(formData, "eleicao"),
      notes: campo(formData, "obs"),
    })
    .select("id")
    .single();
  seErro(PATH, error);
  pronto(`${PATH}/${data!.id}`);
}

export async function salvarGestao(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const path = `${PATH}/${id}`;
  const nome = campo(formData, "nome");
  const inicio = campo(formData, "inicio");
  const fim = campo(formData, "fim");
  if (!nome || !inicio || !fim) erro(path, "Preencha o nome, o início e o fim do mandato.");
  if (fim! <= inicio!) erro(path, "O fim do mandato precisa ser depois do início.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("cipa_mandates")
    .update({
      name: nome,
      unit_id: campo(formData, "unidade"),
      starts_on: inicio,
      ends_on: fim,
      election_on: campo(formData, "eleicao"),
      notes: campo(formData, "obs"),
    })
    .eq("id", id);
  seErro(path, error);
  pronto(path);
}

export async function excluirGestao(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("cipa_mandates").delete().eq("id", id);
  seErro(`${PATH}/${id}`, error);
  pronto(PATH);
}

/* ---------------- Membros ---------------- */

export async function adicionarMembro(formData: FormData) {
  const org = await requireOrg();
  const gestao = String(formData.get("gestao"));
  const path = `${PATH}/${gestao}`;
  const trabalhador = campo(formData, "trabalhador");
  const representacao = campo(formData, "representacao");
  if (!trabalhador || !representacao) erro(path, "Escolha a pessoa e a representação.");
  const supabase = await createClient();
  const { error } = await supabase.from("cipa_members").insert({
    organization_id: org.id,
    mandate_id: gestao,
    worker_id: trabalhador,
    role: String(formData.get("cargo") || "titular"),
    representation: representacao,
    trained_on: campo(formData, "treinamento"),
  });
  if (error?.code === "23505") erro(path, "Esta pessoa já está nesta gestão.");
  seErro(path, error);
  pronto(path);
}

export async function salvarMembro(formData: FormData) {
  await requireOrg();
  const path = `${PATH}/${String(formData.get("gestao"))}`;
  const supabase = await createClient();
  const { error } = await supabase
    .from("cipa_members")
    .update({
      role: String(formData.get("cargo") || "titular"),
      trained_on: campo(formData, "treinamento"),
      left_on: campo(formData, "saida"),
    })
    .eq("id", String(formData.get("id")));
  seErro(path, error);
  pronto(path);
}

export async function removerMembro(formData: FormData) {
  await requireOrg();
  const path = `${PATH}/${String(formData.get("gestao"))}`;
  const supabase = await createClient();
  const { error } = await supabase.from("cipa_members").delete().eq("id", String(formData.get("id")));
  seErro(path, error);
  pronto(path);
}

/* ---------------- Reuniões ---------------- */

export async function criarReuniao(formData: FormData) {
  const org = await requireOrg();
  const gestao = String(formData.get("gestao"));
  const path = `${PATH}/${gestao}`;
  const data = campo(formData, "data");
  if (!data) erro(path, "Informe a data da reunião.");
  const supabase = await createClient();
  const { data: r, error } = await supabase
    .from("cipa_meetings")
    .insert({
      organization_id: org.id,
      mandate_id: gestao,
      held_on: data,
      kind: String(formData.get("tipo") || "ordinaria"),
      agenda: campo(formData, "pauta"),
    })
    .select("id")
    .single();
  seErro(path, error);
  pronto(`${path}/reuniao/${r!.id}`);
}

/** Salva pauta, ata e a lista de presença (marcados = presentes). */
export async function salvarReuniao(formData: FormData) {
  const org = await requireOrg();
  const gestao = String(formData.get("gestao"));
  const id = String(formData.get("id"));
  const path = `${PATH}/${gestao}/reuniao/${id}`;
  const data = campo(formData, "data");
  if (!data) erro(path, "Informe a data da reunião.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("cipa_meetings")
    .update({
      held_on: data,
      kind: String(formData.get("tipo") || "ordinaria"),
      agenda: campo(formData, "pauta"),
      minutes: campo(formData, "ata"),
    })
    .eq("id", id);
  seErro(path, error);
  const presentes = formData.getAll("presente").map(String);
  const { error: e1 } = await supabase.from("cipa_attendances").delete().eq("meeting_id", id);
  seErro(path, e1);
  if (presentes.length) {
    const { error: e2 } = await supabase
      .from("cipa_attendances")
      .insert(presentes.map((m) => ({ organization_id: org.id, meeting_id: id, member_id: m })));
    seErro(path, e2);
  }
  pronto(`${path}?ok=1`);
}

export async function excluirReuniao(formData: FormData) {
  await requireOrg();
  const gestao = String(formData.get("gestao"));
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("cipa_meetings").delete().eq("id", id);
  seErro(`${PATH}/${gestao}/reuniao/${id}`, error);
  pronto(`${PATH}/${gestao}`);
}

/** Deliberação da reunião vira ação, num plano de ação próprio da reunião. */
export async function criarAcaoReuniao(formData: FormData) {
  const org = await requireOrg();
  const gestao = String(formData.get("gestao"));
  const id = String(formData.get("id"));
  const path = `${PATH}/${gestao}/reuniao/${id}`;
  const problema = campo(formData, "problema");
  const acao = campo(formData, "acao");
  if (!problema || !acao) erro(path, "Descreva o problema e a ação.");
  const prazo = campo(formData, "prazo") ?? somarDias(hoje(), 30);
  const supabase = await createClient();
  const { data: r } = await supabase.from("cipa_meetings").select("held_on, plan_id").eq("id", id).maybeSingle();
  if (!r) erro(path, "Reunião não encontrada.");
  let plano = r!.plan_id as string | null;
  if (!plano) {
    const { data: p, error } = await supabase
      .from("action_plans")
      .insert({
        organization_id: org.id,
        title: `CIPA · reunião de ${dataBR(r!.held_on)}`,
        origin: "cipa",
        origin_ref: id,
        due_date: prazo,
      })
      .select("id")
      .single();
    seErro(path, error);
    plano = p!.id;
    const { error: e2 } = await supabase.from("cipa_meetings").update({ plan_id: plano }).eq("id", id);
    seErro(path, e2);
  }
  const { error } = await supabase.from("actions").insert({
    organization_id: org.id,
    plan_id: plano,
    origin: "cipa",
    origin_ref: id,
    problem: problema,
    action: acao,
    responsible_id: campo(formData, "responsavel"),
    due_date: prazo,
  });
  seErro(path, error);
  revalidatePath("/app/acoes", "layout");
  pronto(`${path}?ok=acao`);
}
