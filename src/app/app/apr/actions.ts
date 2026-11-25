"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checklistPadrao, deLocal, TIPOS_PT } from "@/lib/apr";
import { campo, seErro, voltaSegura } from "@/lib/form";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

// Usadas pela Gestão (/app/apr, /app/pt) e pelo Meu EHS (/meu/apr, /meu/pt).
// O campo "voltar" diz para onde ir depois; o banco decide quem pode o quê.

const erro = (volta: string, msg: string): never => redirect(`${volta}?erro=${encodeURIComponent(msg)}`);
const ok = (volta: string) => {
  revalidatePath(volta);
  redirect(volta);
};

function nota(formData: FormData, nome: string) {
  const n = Number(formData.get(nome));
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

async function usuario() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return { supabase, user };
}

/* ---------------- APR ---------------- */

export async function criarApr(formData: FormData) {
  const org = await requireOrg();
  const base = voltaSegura(formData.get("voltar"), "/app/apr");
  const titulo = campo(formData, "titulo");
  if (!titulo) erro(base, "Diga qual é a tarefa.");
  const { supabase, user } = await usuario();
  const { data, error } = await supabase
    .from("aprs")
    .insert({
      organization_id: org.id,
      title: titulo,
      sector_id: campo(formData, "setor"),
      location: campo(formData, "local"),
      planned_on: campo(formData, "data") ?? undefined,
      description: campo(formData, "descricao"),
      created_by: user.id,
    })
    .select("id")
    .single();
  seErro(base, error);
  if (org.workerId) {
    await supabase
      .from("task_signatures")
      .insert({ organization_id: org.id, apr_id: data!.id, worker_id: org.workerId, role: "responsavel" });
  }
  revalidatePath(base);
  redirect(`${base}/${data!.id}`);
}

export async function adicionarEtapa(formData: FormData) {
  const org = await requireOrg();
  const volta = voltaSegura(formData.get("voltar"), "/app/apr");
  const s = nota(formData, "severidade");
  const p = nota(formData, "probabilidade");
  const etapa = campo(formData, "etapa");
  const perigo = campo(formData, "perigo");
  const controles = campo(formData, "controles");
  if (!etapa || !perigo || !controles || !s || !p) {
    erro(volta, "Preencha a etapa, o perigo, a severidade, a probabilidade e as medidas de controle.");
  }
  const { supabase } = await usuario();
  const aprId = String(formData.get("apr"));
  const { count } = await supabase.from("apr_steps").select("id", { count: "exact", head: true }).eq("apr_id", aprId);
  const { error } = await supabase.from("apr_steps").insert({
    organization_id: org.id,
    apr_id: aprId,
    position: (count ?? 0) + 1,
    step: etapa,
    hazard: perigo,
    harm: campo(formData, "dano"),
    severity: s,
    probability: p,
    controls: controles,
  });
  seErro(volta, error);
  ok(volta);
}

export async function removerEtapa(formData: FormData) {
  await requireOrg();
  const volta = voltaSegura(formData.get("voltar"), "/app/apr");
  const { supabase } = await usuario();
  const { error } = await supabase.from("apr_steps").delete().eq("id", String(formData.get("id")));
  seErro(volta, error);
  ok(volta);
}

export async function enviarApr(formData: FormData) {
  await requireOrg();
  const volta = voltaSegura(formData.get("voltar"), "/app/apr");
  const id = String(formData.get("id"));
  const { supabase } = await usuario();
  const { count } = await supabase.from("apr_steps").select("id", { count: "exact", head: true }).eq("apr_id", id);
  if (!count) erro(volta, "Inclua pelo menos uma etapa antes de enviar.");
  const { data, error } = await supabase
    .from("aprs")
    .update({ status: "aguardando_aprovacao" })
    .eq("id", id)
    .in("status", ["rascunho", "reprovada"])
    .select("id");
  seErro(volta, error);
  if (!data?.length) erro(volta, "Esta APR não pode mais ser enviada.");
  ok(volta);
}

/** Equipe: aprova ou devolve para ajuste. */
export async function revisarApr(formData: FormData) {
  await requireOrg();
  const volta = voltaSegura(formData.get("voltar"), "/app/apr");
  const aprovar = formData.get("decisao") === "aprovar";
  const notas = campo(formData, "notas");
  if (!aprovar && !notas) erro(volta, "Explique o que precisa ser ajustado.");
  const { supabase, user } = await usuario();
  const { data, error } = await supabase
    .from("aprs")
    .update({
      status: aprovar ? "aprovada" : "reprovada",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: notas,
    })
    .eq("id", String(formData.get("id")))
    .eq("status", "aguardando_aprovacao")
    .select("id");
  seErro(volta, error);
  if (!data?.length) erro(volta, "Só a equipe de segurança aprova APR aguardando aprovação.");
  ok(volta);
}

export async function encerrarApr(formData: FormData) {
  await requireOrg();
  const volta = voltaSegura(formData.get("voltar"), "/app/apr");
  const { supabase } = await usuario();
  const { error } = await supabase.from("aprs").update({ status: "encerrada" }).eq("id", String(formData.get("id")));
  seErro(volta, error);
  ok(volta);
}

export async function excluirApr(formData: FormData) {
  await requireOrg();
  const volta = voltaSegura(formData.get("voltar"), "/app/apr/x");
  const lista = volta.replace(/\/[^/]+$/, "");
  const { supabase } = await usuario();
  const { error } = await supabase.from("aprs").delete().eq("id", String(formData.get("id")));
  seErro(volta, error);
  ok(lista);
}

/* ---------------- Participantes e assinatura (APR e PT) ---------------- */

export async function adicionarParticipante(formData: FormData) {
  const org = await requireOrg();
  const volta = voltaSegura(formData.get("voltar"), "/app/apr");
  const trabalhador = campo(formData, "trabalhador");
  if (!trabalhador) erro(volta, "Escolha o trabalhador.");
  const { supabase } = await usuario();
  const { error } = await supabase.from("task_signatures").insert({
    organization_id: org.id,
    apr_id: campo(formData, "apr"),
    permit_id: campo(formData, "pt"),
    worker_id: trabalhador,
    role: String(formData.get("papel") || "executante"),
  });
  if (error?.code === "23505") erro(volta, "Esta pessoa já está na lista.");
  seErro(volta, error);
  ok(volta);
}

export async function removerParticipante(formData: FormData) {
  await requireOrg();
  const volta = voltaSegura(formData.get("voltar"), "/app/apr");
  const { supabase } = await usuario();
  const { error } = await supabase.from("task_signatures").delete().eq("id", String(formData.get("id")));
  seErro(volta, error);
  ok(volta);
}

/** O próprio trabalhador assina, logado no celular. */
export async function assinarTarefa(formData: FormData) {
  await requireOrg();
  const volta = voltaSegura(formData.get("voltar"), "/meu/apr");
  const { supabase } = await usuario();
  const aparelho = (await headers()).get("user-agent");
  const { data, error } = await supabase.rpc("sign_task", {
    p_signature: String(formData.get("id")),
    p_device: aparelho,
  });
  seErro(volta, error);
  if (!data) erro(volta, "Não foi possível assinar: a assinatura já foi feita ou não é sua.");
  ok(volta);
}

/* ---------------- PT ---------------- */

export async function criarPt(formData: FormData) {
  const org = await requireOrg();
  const base = voltaSegura(formData.get("voltar"), "/app/pt");
  const tipo = String(formData.get("tipo"));
  const descricao = campo(formData, "descricao");
  const inicio = deLocal(campo(formData, "inicio"));
  const fim = deLocal(campo(formData, "fim"));
  if (!TIPOS_PT[tipo] || !descricao || !inicio || !fim) erro(base, "Preencha o tipo, o serviço, o início e o fim.");
  if (fim! <= inicio!) erro(base, "O fim precisa ser depois do início.");
  const { supabase, user } = await usuario();
  const { data, error } = await supabase
    .from("work_permits")
    .insert({
      organization_id: org.id,
      kind: tipo,
      apr_id: campo(formData, "apr"),
      sector_id: campo(formData, "setor"),
      location: campo(formData, "local"),
      description: descricao,
      valid_from: inicio,
      valid_until: fim,
      requested_by: user.id,
    })
    .select("id")
    .single();
  seErro(base, error);
  const id = data!.id;
  const { error: e2 } = await supabase.from("permit_checks").insert(
    checklistPadrao(tipo).map((q, i) => ({ organization_id: org.id, permit_id: id, position: i + 1, question: q })),
  );
  seErro(`${base}/${id}`, e2);
  if (org.workerId) {
    await supabase
      .from("task_signatures")
      .insert({ organization_id: org.id, permit_id: id, worker_id: org.workerId, role: "responsavel" });
  }
  revalidatePath(base);
  redirect(`${base}/${id}`);
}

export async function responderChecklist(formData: FormData) {
  await requireOrg();
  const volta = voltaSegura(formData.get("voltar"), "/app/pt");
  const { supabase } = await usuario();
  for (const [chave, valor] of formData.entries()) {
    if (!chave.startsWith("r_") || !["sim", "nao", "na"].includes(String(valor))) continue;
    const { error } = await supabase.from("permit_checks").update({ answer: String(valor) }).eq("id", chave.slice(2));
    seErro(volta, error);
  }
  ok(volta);
}

/** Equipe: libera a PT. Exige checklist completo, sem "não", e todos os participantes assinados. */
export async function liberarPt(formData: FormData) {
  await requireOrg();
  const volta = voltaSegura(formData.get("voltar"), "/app/pt");
  const id = String(formData.get("id"));
  const { supabase, user } = await usuario();
  const [{ data: checks }, { data: assinaturas }] = await Promise.all([
    supabase.from("permit_checks").select("answer").eq("permit_id", id),
    supabase.from("task_signatures").select("signed_at").eq("permit_id", id),
  ]);
  if ((checks ?? []).some((c) => !c.answer)) erro(volta, "Responda todo o checklist antes de liberar.");
  if ((checks ?? []).some((c) => c.answer === "nao"))
    erro(volta, "Há itens do checklist com “Não”. Corrija a condição antes de liberar.");
  if (!assinaturas?.length) erro(volta, "Inclua quem vai executar o serviço.");
  if (assinaturas!.some((a) => !a.signed_at)) erro(volta, "Todos os participantes precisam assinar antes da liberação.");
  const { data, error } = await supabase
    .from("work_permits")
    .update({ status: "liberada", issued_by: user.id, issued_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "solicitada")
    .select("id");
  seErro(volta, error);
  if (!data?.length) erro(volta, "Só a equipe de segurança libera uma PT solicitada.");
  ok(volta);
}

export async function encerrarPt(formData: FormData) {
  await requireOrg();
  const volta = voltaSegura(formData.get("voltar"), "/app/pt");
  const cancelar = formData.get("cancelar") === "1";
  const { supabase } = await usuario();
  const { error } = await supabase
    .from("work_permits")
    .update({
      status: cancelar ? "cancelada" : "encerrada",
      closed_at: new Date().toISOString(),
      closing_notes: campo(formData, "notas"),
    })
    .eq("id", String(formData.get("id")));
  seErro(volta, error);
  ok(volta);
}
