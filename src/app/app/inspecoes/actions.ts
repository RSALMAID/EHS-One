"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nomeArquivo } from "@/lib/acoes";
import { campo, seErro, voltaSegura } from "@/lib/form";
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

// As funções abaixo servem à Gestão (/app/inspecoes) e ao Meu EHS (/meu/inspecoes).

export async function iniciarInspecao(formData: FormData) {
  const org = await requireOrg();
  const base = voltaSegura(formData.get("voltar"), PATH);
  const modelo = campo(formData, "modelo");
  if (!modelo) redirect(`${base}?erro=${encodeURIComponent("Escolha um modelo de checklist.")}`);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: itens, error: e1 } = await supabase
    .from("checklist_items")
    .select("id, position, question")
    .eq("template_id", modelo)
    .order("position");
  seErro(base, e1);
  if (!itens?.length) redirect(`${base}?erro=${encodeURIComponent("Este modelo não tem perguntas ainda.")}`);
  const { data: insp, error } = await supabase
    .from("inspections")
    .insert({
      organization_id: org.id,
      template_id: modelo,
      sector_id: campo(formData, "setor"),
      location: campo(formData, "local"),
      inspected_on: campo(formData, "data") ?? undefined,
      inspector: campo(formData, "inspetor"),
      created_by: user!.id,
    })
    .select("id")
    .single();
  seErro(base, error);
  const { error: e2 } = await supabase.from("inspection_answers").insert(
    itens.map((i) => ({
      organization_id: org.id,
      inspection_id: insp!.id,
      item_id: i.id,
      position: i.position,
      question: i.question,
    })),
  );
  seErro(base, e2);
  revalidatePath(base);
  redirect(`${base}/${insp!.id}`);
}

/** Salva respostas, comentários e fotos. Com "concluir", o banco abre uma ação para cada não conformidade. */
export async function salvarRespostas(formData: FormData) {
  const org = await requireOrg();
  const id = String(formData.get("id"));
  const path = voltaSegura(formData.get("voltar"), `${PATH}/${id}`);
  const concluir = formData.get("concluir") === "1";
  const supabase = await createClient();
  const { data: respostas, error: e1 } = await supabase
    .from("inspection_answers")
    .select("id")
    .eq("inspection_id", id);
  seErro(path, e1);

  for (const r of respostas ?? []) {
    const dados: Record<string, string | null> = {
      answer: campo(formData, `r_${r.id}`),
      comment: campo(formData, `c_${r.id}`),
    };
    const foto = formData.get(`f_${r.id}`);
    if (foto instanceof File && foto.size > 0) {
      const caminho = `${org.id}/inspecoes/${id}/${nomeArquivo(foto.name)}`;
      const { error } = await supabase.storage.from("evidencias").upload(caminho, foto, { contentType: foto.type });
      seErro(path, error);
      dados.photo_path = caminho;
      dados.photo_name = foto.name;
    }
    const { error } = await supabase.from("inspection_answers").update(dados).eq("id", r.id);
    seErro(path, error);
  }
  const { error: e2 } = await supabase.from("inspections").update({ notes: campo(formData, "obs") }).eq("id", id);
  seErro(path, e2);

  let ok = "salva";
  if (concluir) {
    const { data: n, error } = await supabase.rpc("conclude_inspection", { p_id: id });
    seErro(path, error);
    ok = `concluida-${n ?? 0}`;
  }
  revalidatePath(path);
  revalidatePath("/app/acoes", "layout");
  redirect(`${path}?ok=${ok}`);
}

export async function reabrirInspecao(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const path = voltaSegura(formData.get("voltar"), `${PATH}/${id}`);
  const supabase = await createClient();
  const { error } = await supabase.from("inspections").update({ status: "em_andamento", concluded_at: null }).eq("id", id);
  seErro(path, error);
  revalidatePath(path);
}

export async function excluirInspecao(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const path = voltaSegura(formData.get("voltar"), `${PATH}/${id}`);
  const lista = path.replace(/\/[^/]+$/, "");
  const supabase = await createClient();
  const { error } = await supabase.from("inspections").delete().eq("id", id);
  seErro(path, error);
  revalidatePath(lista);
  redirect(lista);
}
