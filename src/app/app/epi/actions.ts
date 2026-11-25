"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { campo, seErro } from "@/lib/form";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const PATH = "/app/epi";

function inteiro(formData: FormData, nome: string): number | null {
  const n = Number(formData.get(nome));
  return Number.isInteger(n) && n > 0 ? n : null;
}

function dadosItem(formData: FormData) {
  return {
    name: campo(formData, "nome"),
    ca_number: campo(formData, "ca"),
    ca_valid_until: campo(formData, "validade"),
    manufacturer: campo(formData, "fabricante"),
    replacement_days: inteiro(formData, "troca"),
  };
}

export async function adicionarItem(formData: FormData) {
  const org = await requireOrg();
  const dados = dadosItem(formData);
  if (!dados.name) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("ppe_items")
    .insert({ ...dados, organization_id: org.id, stock: inteiro(formData, "estoque") ?? 0 });
  seErro(PATH, error);
  revalidatePath(PATH);
}

export async function salvarItem(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const path = `${PATH}/${id}`;
  const dados = dadosItem(formData);
  if (!dados.name) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("ppe_items")
    .update({ ...dados, active: formData.get("ativo") === "on" })
    .eq("id", id);
  seErro(path, error);
  revalidatePath(path);
}

/** Entrada (compra) ou acerto de estoque. Quantidade negativa tira do estoque. */
export async function movimentarEstoque(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const path = `${PATH}/${id}`;
  const qtd = Number(formData.get("quantidade"));
  if (!Number.isInteger(qtd) || qtd === 0) return;
  const supabase = await createClient();
  const { data: item } = await supabase.from("ppe_items").select("stock").eq("id", id).single();
  if (!item) return;
  const novo = item.stock + qtd;
  if (novo < 0) redirect(`${path}?erro=${encodeURIComponent(`O estoque ficaria negativo (há ${item.stock}).`)}`);
  const { error } = await supabase.from("ppe_items").update({ stock: novo }).eq("id", id);
  seErro(path, error);
  revalidatePath(path);
}

export async function salvarCargosObrigatorios(formData: FormData) {
  const org = await requireOrg();
  const id = String(formData.get("id"));
  const path = `${PATH}/${id}`;
  const cargos = formData.getAll("cargos").map(String);
  const supabase = await createClient();
  const { error: e1 } = await supabase.from("ppe_job_roles").delete().eq("ppe_item_id", id);
  seErro(path, e1);
  if (cargos.length) {
    const { error } = await supabase
      .from("ppe_job_roles")
      .insert(cargos.map((c) => ({ ppe_item_id: id, job_role_id: c, organization_id: org.id })));
    seErro(path, error);
  }
  revalidatePath(path);
}

export async function removerItem(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("ppe_items").delete().eq("id", id);
  if (error?.code === "23503") {
    redirect(
      `${PATH}/${id}?erro=${encodeURIComponent("Este EPI já tem entregas registradas e não pode ser excluído. Desmarque “Em uso” para tirá-lo da lista.")}`,
    );
  }
  seErro(`${PATH}/${id}`, error);
  revalidatePath(PATH);
  redirect(PATH);
}

export async function registrarEntrega(formData: FormData) {
  const org = await requireOrg();
  const path = `${PATH}/entregas`;
  const trabalhador = campo(formData, "trabalhador");
  const item = campo(formData, "item");
  const assinatura = campo(formData, "assinatura");
  if (!trabalhador || !item || !assinatura || formData.get("declaro") !== "on") {
    redirect(
      `${path}?erro=${encodeURIComponent("Escolha trabalhador e EPI, peça para o trabalhador digitar o nome e marcar a declaração.")}`,
    );
  }
  const supabase = await createClient();
  const { error } = await supabase.from("ppe_deliveries").insert({
    organization_id: org.id,
    worker_id: trabalhador,
    ppe_item_id: item,
    quantity: inteiro(formData, "quantidade") ?? 1,
    delivered_on: campo(formData, "data") ?? undefined,
    reason: String(formData.get("motivo") ?? "primeira"),
    signature_name: assinatura,
  });
  seErro(path, error);
  revalidatePath(PATH, "layout");
  redirect(`${path}?ok=1`);
}

export async function excluirEntrega(formData: FormData) {
  await requireOrg();
  const path = `${PATH}/entregas`;
  const supabase = await createClient();
  const { error } = await supabase.from("ppe_deliveries").delete().eq("id", String(formData.get("id")));
  seErro(path, error);
  revalidatePath(PATH, "layout");
}

/** Abre uma ação na Central de Ações a partir de uma pendência de EPI. */
export async function criarAcaoEpi(formData: FormData) {
  const org = await requireOrg();
  const supabase = await createClient();
  const { error } = await supabase.from("actions").insert({
    organization_id: org.id,
    origin: "vencimento",
    origin_ref: campo(formData, "item"),
    problem: String(formData.get("problema")),
    action: String(formData.get("acao")),
    due_date: campo(formData, "prazo"),
  });
  seErro(`${PATH}/pendencias`, error);
  revalidatePath("/app/acoes");
  redirect("/app/acoes");
}
