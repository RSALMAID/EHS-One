"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { somarMeses } from "@/lib/datas";
import { campo, seErro } from "@/lib/form";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const PATH = "/app/saude";

function voltar(formData: FormData) {
  return String(formData.get("voltar") || PATH);
}

export async function registrarAso(formData: FormData) {
  const org = await requireOrg();
  const path = voltar(formData);
  const trabalhador = campo(formData, "trabalhador");
  const data = campo(formData, "data");
  const tipo = String(formData.get("tipo"));
  if (!trabalhador || !data) {
    redirect(`${path}?erro=${encodeURIComponent("Escolha o trabalhador e a data do ASO.")}`);
  }
  const meses = Number(formData.get("meses"));
  const proximo =
    campo(formData, "proximo") ??
    (tipo !== "demissional" && Number.isInteger(meses) && meses > 0 ? somarMeses(data, meses) : null);
  const supabase = await createClient();
  const { error } = await supabase.from("asos").insert({
    organization_id: org.id,
    worker_id: trabalhador,
    kind: tipo,
    issued_on: data,
    result: String(formData.get("resultado")),
    restrictions: campo(formData, "restricoes"),
    physician_name: campo(formData, "medico"),
    physician_crm: campo(formData, "crm"),
    next_due: proximo,
  });
  seErro(path, error);
  revalidatePath(PATH, "layout");
  redirect(`${path}?ok=1`);
}

export async function removerAso(formData: FormData) {
  await requireOrg();
  const path = voltar(formData);
  const supabase = await createClient();
  const { error } = await supabase.from("asos").delete().eq("id", String(formData.get("id")));
  seErro(path, error);
  revalidatePath(PATH, "layout");
}

export async function adicionarTipoExame(formData: FormData) {
  const org = await requireOrg();
  const nome = campo(formData, "nome");
  if (!nome) return;
  const supabase = await createClient();
  const { error } = await supabase.from("exam_types").insert({ organization_id: org.id, name: nome });
  seErro(`${PATH}/exames`, error);
  revalidatePath(`${PATH}/exames`);
}

export async function removerTipoExame(formData: FormData) {
  await requireOrg();
  const supabase = await createClient();
  const { error } = await supabase.from("exam_types").delete().eq("id", String(formData.get("id")));
  if (error?.code === "23503") {
    redirect(`${PATH}/exames?erro=${encodeURIComponent("Este exame já foi lançado para algum trabalhador e não pode ser excluído.")}`);
  }
  seErro(`${PATH}/exames`, error);
  revalidatePath(`${PATH}/exames`);
}

export async function exigirExame(formData: FormData) {
  const org = await requireOrg();
  const exame = campo(formData, "exame");
  const cargo = campo(formData, "cargo");
  const meses = Number(formData.get("meses"));
  if (!exame || !cargo || !Number.isInteger(meses) || meses < 1) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("exam_job_roles")
    .upsert({ organization_id: org.id, exam_type_id: exame, job_role_id: cargo, periodicity_months: meses });
  seErro(`${PATH}/exames`, error);
  revalidatePath(PATH, "layout");
}

export async function removerExigencia(formData: FormData) {
  await requireOrg();
  const supabase = await createClient();
  const { error } = await supabase
    .from("exam_job_roles")
    .delete()
    .eq("exam_type_id", String(formData.get("exame")))
    .eq("job_role_id", String(formData.get("cargo")));
  seErro(`${PATH}/exames`, error);
  revalidatePath(PATH, "layout");
}

export async function registrarExame(formData: FormData) {
  const org = await requireOrg();
  const trabalhador = String(formData.get("trabalhador"));
  const path = `${PATH}/trabalhador/${trabalhador}`;
  const exame = campo(formData, "exame");
  const data = campo(formData, "data");
  if (!exame || !data) redirect(`${path}?erro=${encodeURIComponent("Escolha o exame e a data.")}`);
  const supabase = await createClient();
  const { error } = await supabase.from("worker_exams").insert({
    organization_id: org.id,
    worker_id: trabalhador,
    exam_type_id: exame,
    performed_on: data,
    notes: campo(formData, "obs"),
  });
  seErro(path, error);
  revalidatePath(PATH, "layout");
}

export async function removerExame(formData: FormData) {
  await requireOrg();
  const trabalhador = String(formData.get("trabalhador"));
  const supabase = await createClient();
  const { error } = await supabase.from("worker_exams").delete().eq("id", String(formData.get("id")));
  seErro(`${PATH}/trabalhador/${trabalhador}`, error);
  revalidatePath(PATH, "layout");
}

export async function criarAcaoSaude(formData: FormData) {
  const org = await requireOrg();
  const supabase = await createClient();
  const { error } = await supabase.from("actions").insert({
    organization_id: org.id,
    origin: "vencimento",
    origin_ref: campo(formData, "ref"),
    problem: String(formData.get("problema")),
    action: String(formData.get("acao")),
    due_date: campo(formData, "prazo"),
  });
  seErro(PATH, error);
  revalidatePath("/app/acoes");
  redirect("/app/acoes");
}
