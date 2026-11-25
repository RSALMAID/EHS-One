import { redirect } from "next/navigation";

/** Texto de um campo de formulário, sem espaços; vazio vira null. */
export function campo(formData: FormData, nome: string): string | null {
  const valor = String(formData.get(nome) ?? "").trim();
  return valor || null;
}

/** Volta para a página mostrando a mensagem do banco, se houver erro. */
export function seErro(path: string, error: { message: string } | null) {
  if (error) {
    console.error(`Erro em ${path}:`, error);
    redirect(`${path}?erro=${encodeURIComponent(error.message)}`);
  }
}

/** Caminho de volta aceito pelas ações: só dentro do sistema. */
export function voltaSegura(v: FormDataEntryValue | null, padrao: string) {
  const s = String(v ?? "");
  return /^\/(app|meu)\/[a-z0-9/_-]*$/i.test(s) ? s : padrao;
}
