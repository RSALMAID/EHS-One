"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { somarDias, hoje } from "@/lib/datas";
import { campo, seErro } from "@/lib/form";
import { MODELOS_EXEMPLO } from "@/lib/inspecao";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const PATH = "/app/inspecoes";

export async function criarModelo(formData: FormData) {
  const org = await requireOrg();
  const nome = campo(formData, "nome");
  if (!nome) return;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklist_templates")
    .insert({ organization_id: org.id, name: nome, description: campo(formData, "descricao") })
    .select("id")
    .single();
  seErro(`${PATH}/modelos`, error);
  redirect(`${PATH}/modelos/${data!.id}`);
}

export async function criarModelosExemplo() {
  const org = await requireOrg();
  const supabase = await createClient();
  for (const m of MODELOS_EXEMPLO) {
    const { data, error } = await supabase
      .from("checklist_templates")
      .insert({ organization_id: org.id, name: m.nome, description: m.descricao })
      .select("id")
      .single();
    seErro(`${PATH}/modelos`, error);
    const { error: e2 } = await supabase.from("checklist_items").insert(
      m.perguntas.map((q, i) => ({ organization_id: org.id, template_id: data!.id, position: i + 1, question: q })),
    );
    seErro(`${PATH}/modelos`, e2);
  }
  revalidatePath(PATH, "layout");
}

export async function salvarModelo(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const nome = campo(formData, "nome");
  if (!nome) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("checklist_templates")
    .update({ name: nome, description: campo(formData, "descricao"), active: formData.get("ativo") === "on" })
    .eq("id", id);
  seErro(`${PATH}/modelos/${id}`, error);
  revalidatePath(PATH, "layout");
}

export async function adicionarPergunta(formData: FormData) {
  const org = await requireOrg();
  const modelo = String(formData.get("modelo"));
  const pergunta = campo(formData, "pergunta");
  if (!pergunta) return;
  const supabase = await createClient();
  const { data: ultima } = await supabase
    .from("checklist_items")
    .select("position")
    .eq("template_id", modelo)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("checklist_items").insert({
    organization_id: org.id,
    template_id: modelo,
    position: (ultima?.position ?? 0) + 1,
    question: pergunta,
  });
  seErro(`${PATH}/modelos/${modelo}`, error);
  revalidatePath(`${PATH}/modelos/${modelo}`);
}

export async function removerPergunta(formData: FormData) {
  await requireOrg();
  const modelo = String(formData.get("modelo"));
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_items").delete().eq("id", String(formData.get("id")));
  seErro(`${PATH}/modelos/${modelo}`, error);
  revalidatePath(`${PATH}/modelos/${modelo}`);
}

export async function removerModelo(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_templates").delete().eq("id", id);
  if (error?.code === "23503") {
    redirect(`${PATH}/modelos/${id}?erro=${encodeURIComponent("Este modelo já foi usado em inspeções. Desmarque “Em uso”.")}`);
  }
  seErro(`${PATH}/modelos/${id}`, error);
  revalidatePath(PATH, "layout");
  redirect(`${PATH}/modelos`);
}

export async function iniciarInspecao(formData: FormData) {
  const org = await requireOrg();
  const modelo = campo(formData, "modelo");
  if (!modelo) redirect(`${PATH}?erro=${encodeURIComponent("Escolha um modelo de checklist.")}`);
  const supabase = await createClient();
  const { data: itens, error: e1 } = await supabase
    .from("checklist_items")
    .select("id, position, question")
    .eq("template_id", modelo)
    .order("position");
  seErro(PATH, e1);
  if (!itens?.length) redirect(`${PATH}?erro=${encodeURIComponent("Este modelo não tem perguntas ainda.")}`);
  const { data: insp, error } = await supabase
    .from("inspections")
    .insert({
      organization_id: org.id,
      template_id: modelo,
      sector_id: campo(formData, "setor"),
      inspected_on: campo(formData, "data") ?? undefined,
      inspector: campo(formData, "inspetor"),
    })
    .select("id")
    .single();
  seErro(PATH, error);
  const { error: e2 } = await supabase.from("inspection_answers").insert(
    itens.map((i) => ({
      organization_id: org.id,
      inspection_id: insp!.id,
      item_id: i.id,
      position: i.position,
      question: i.question,
    })),
  );
  seErro(PATH, e2);
  redirect(`${PATH}/${insp!.id}`);
}

/** Salva todas as respostas do formulário. Com "concluir", abre ações para cada não conformidade. */
export async function salvarRespostas(formData: FormData) {
  const org = await requireOrg();
  const id = String(formData.get("id"));
  const path = `${PATH}/${id}`;
  const concluir = formData.get("concluir") === "1";
  const supabase = await createClient();
  const { data: respostas, error: e1 } = await supabase
    .from("inspection_answers")
    .select("id, question, action_id")
    .eq("inspection_id", id);
  seErro(path, e1);

  const pendentes: string[] = [];
  for (const r of respostas ?? []) {
    const resposta = campo(formData, `r_${r.id}`);
    const comentario = campo(formData, `c_${r.id}`);
    if (!resposta) pendentes.push(r.question);
    const { error } = await supabase
      .from("inspection_answers")
      .update({ answer: resposta, comment: comentario })
      .eq("id", r.id);
    seErro(path, error);
  }
  await supabase.from("inspections").update({ notes: campo(formData, "obs") }).eq("id", id);

  if (concluir) {
    if (pendentes.length) {
      redirect(`${path}?erro=${encodeURIComponent(`Responda todas as perguntas antes de concluir (faltam ${pendentes.length}).`)}`);
    }
    const { data: insp } = await supabase
      .from("inspections")
      .select("checklist_templates(name), sectors(name)")
      .eq("id", id)
      .single();
    const info = insp as unknown as { checklist_templates: { name: string } | null; sectors: { name: string } | null };
    const local = info.sectors?.name ? ` (${info.sectors.name})` : "";
    const { data: ncs } = await supabase
      .from("inspection_answers")
      .select("id, question, comment, action_id")
      .eq("inspection_id", id)
      .eq("answer", "nao_conforme")
      .is("action_id", null);
    for (const nc of ncs ?? []) {
      const { data: acao, error } = await supabase
        .from("actions")
        .insert({
          organization_id: org.id,
          origin: "inspecao",
          origin_ref: id,
          problem: `${info.checklist_templates?.name ?? "Inspeção"}${local}: ${nc.question}${nc.comment ? ` — ${nc.comment}` : ""}`,
          action: "Corrigir a não conformidade apontada na inspeção",
          due_date: somarDias(hoje(), 15),
        })
        .select("id")
        .single();
      seErro(path, error);
      await supabase.from("inspection_answers").update({ action_id: acao!.id }).eq("id", nc.id);
    }
    const { error } = await supabase
      .from("inspections")
      .update({ status: "concluida", concluded_at: new Date().toISOString() })
      .eq("id", id);
    seErro(path, error);
  }
  revalidatePath(PATH, "layout");
  revalidatePath("/app/acoes");
  redirect(`${path}?ok=${concluir ? "concluida" : "salva"}`);
}

export async function reabrirInspecao(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("inspections").update({ status: "em_andamento", concluded_at: null }).eq("id", id);
  seErro(`${PATH}/${id}`, error);
  revalidatePath(PATH, "layout");
}

export async function excluirInspecao(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("inspections").delete().eq("id", id);
  seErro(`${PATH}/${id}`, error);
  revalidatePath(PATH, "layout");
  redirect(PATH);
}
