"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nomeArquivo } from "@/lib/acoes";
import { campo, seErro, voltaSegura } from "@/lib/form";
import { headers } from "next/headers";
import { type ConteudoChecklist, MODELOS_EXEMPLO } from "@/lib/inspecao";
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

/** Copia um modelo da biblioteca EHS One para a empresa, que pode editá-lo depois. */
export async function usarModeloBiblioteca(formData: FormData) {
  const org = await requireOrg();
  const codigo = String(formData.get("codigo"));
  const supabase = await createClient();
  const { data: m, error: e0 } = await supabase.from("model_library").select("code, title, content").eq("code", codigo).maybeSingle();
  seErro(`${PATH}/modelos`, e0);
  if (!m) redirect(`${PATH}/modelos?erro=${encodeURIComponent("Modelo não encontrado.")}`);
  const c = m.content as ConteudoChecklist;
  const { data, error } = await supabase
    .from("checklist_templates")
    .insert({
      organization_id: org.id,
      name: m.title,
      description: c.equipamento ? `Inspeção de ${c.equipamento} antes do uso` : null,
      library_code: m.code,
      equipment: c.equipamento ?? null,
      signature_roles: c.assinaturas ?? [],
    })
    .select("id")
    .single();
  seErro(`${PATH}/modelos`, error);
  const { error: e2 } = await supabase.from("checklist_items").insert(
    c.itens.map((it, i) => ({ organization_id: org.id, template_id: data!.id, position: i + 1, question: it.pergunta })),
  );
  seErro(`${PATH}/modelos`, e2);
  revalidatePath(PATH, "layout");
  redirect(`${PATH}/modelos/${data!.id}?ok=copiado`);
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
  const { data: tpl } = await supabase.from("checklist_templates").select("equipment").eq("id", modelo).maybeSingle();
  const tag = campo(formData, "tag");
  if (tpl?.equipment && !tag) redirect(`${base}?erro=${encodeURIComponent("Informe a TAG do equipamento.")}#novo`);
  const { data: insp, error } = await supabase
    .from("inspections")
    .insert({
      organization_id: org.id,
      template_id: modelo,
      sector_id: campo(formData, "setor"),
      location: campo(formData, "local"),
      inspected_on: campo(formData, "data") ?? undefined,
      inspector: campo(formData, "inspetor"),
      inspector_document: campo(formData, "documento"),
      company_name: campo(formData, "empresa"),
      equipment_tag: tag,
      inspected_at: campo(formData, "hora"),
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
  if (concluir) {
    const { data: semObs } = await supabase
      .from("inspection_answers")
      .select("position")
      .eq("inspection_id", id)
      .eq("answer", "nao_conforme")
      .or("comment.is.null,comment.eq.");
    if (semObs?.length) {
      const itens = semObs.map((r) => r.position).join(", ");
      redirect(`${path}?erro=${encodeURIComponent(`Todo "Não" precisa de observação. Falta no(s) item(ns) ${itens}.`)}`);
    }
  }

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

/** Assinatura desenhada. O banco carimba data e hora, calcula o hash e bloqueia alterações. */
export async function assinarInspecao(formData: FormData) {
  const org = await requireOrg();
  const id = String(formData.get("id"));
  const path = voltaSegura(formData.get("voltar"), `${PATH}/${id}`);
  const nome = campo(formData, "nome");
  const documento = campo(formData, "documento");
  const papel = campo(formData, "papel");
  const imagem = String(formData.get("imagem") ?? "");
  if (!nome || !documento || !papel) redirect(`${path}?erro=${encodeURIComponent("Preencha o nome e o documento de quem assina.")}#assinaturas`);
  if (!imagem.startsWith("data:image/png;base64,")) redirect(`${path}?erro=${encodeURIComponent("Desenhe a assinatura no quadro.")}#assinaturas`);
  if (formData.get("ciente") !== "on") redirect(`${path}?erro=${encodeURIComponent("Confirme a declaração antes de assinar.")}#assinaturas`);
  const h = await headers();
  const supabase = await createClient();
  const { error } = await supabase.from("inspection_signatures").insert({
    organization_id: org.id,
    inspection_id: id,
    role: papel,
    signer_name: nome,
    signer_document: documento,
    image: imagem,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip"),
    device: h.get("user-agent"),
  });
  if (error?.code === "23505") redirect(`${path}?erro=${encodeURIComponent("Este papel já foi assinado.")}#assinaturas`);
  seErro(path, error);
  revalidatePath(path);
  redirect(`${path}?ok=assinada#assinaturas`);
}
