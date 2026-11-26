import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Role =
  | "proprietario"
  | "admin_ehs"
  | "gestor"
  | "trabalhador"
  | "medico"
  | "consultor";

export type CurrentOrg = {
  id: string;
  name: string;
  plan: string;
  trialEndsAt: string;
  role: Role;
  /** Ficha de trabalhador ligada a este login nesta empresa (para o Meu EHS). */
  workerId: string | null;
};

/** Perfis que usam a área de Gestão. O trabalhador usa só o Meu EHS. */
export function ehEquipe(role: Role) {
  return role !== "trabalhador";
}

/**
 * Empresa ativa do usuário logado. No MVP é a primeira em que ele é membro;
 * o perfil Consultor (V2) ganhará a troca de empresa na barra superior.
 */
export const requireOrg = cache(async (): Promise<CurrentOrg> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const buscar = () =>
    supabase
      .from("memberships")
      .select("role, organizations(id, name, plan, trial_ends_at)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
  let { data, error } = await buscar();
  if (!error && !data) {
    // Primeiro acesso de quem foi convidado: aceita o convite e tenta de novo.
    const { data: aceitos } = await supabase.rpc("accept_invitations");
    if (aceitos) ({ data, error } = await buscar());
  }

  const org = data?.organizations as unknown as
    | { id: string; name: string; plan: string; trial_ends_at: string }
    | null
    | undefined;
  if (error) {
    // Sem isto, uma falha de permissão parecia "sem empresa" e o cadastro
    // voltava em loop para /onboarding.
    console.error("Falha ao ler a empresa do usuário:", error);
    redirect(
      `/onboarding?erro=${encodeURIComponent(
        `O banco recusou a leitura da sua empresa (${error.message}). ` +
          "Rode o arquivo supabase/migrations/0002_permissoes.sql no SQL Editor do Supabase.",
      )}`,
    );
  }
  if (!data || !org) redirect("/onboarding");

  const { data: ficha } = await supabase
    .from("workers")
    .select("id")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return {
    id: org.id,
    name: org.name,
    plan: org.plan,
    trialEndsAt: org.trial_ends_at,
    role: data.role as Role,
    workerId: ficha?.id ?? null,
  };
});

export function trialDaysLeft(trialEndsAt: string): number {
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/** Teste grátis terminou sem plano escolhido: só a tela de planos abre. */
export function testeVencido(org: Pick<CurrentOrg, "plan" | "trialEndsAt">) {
  return org.plan === "teste" && new Date(org.trialEndsAt).getTime() < Date.now();
}
