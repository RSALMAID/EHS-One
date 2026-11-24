import { redirect } from "next/navigation";
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
};

/**
 * Empresa ativa do usuário logado. No MVP é a primeira em que ele é membro;
 * o perfil Consultor (V2) ganhará a troca de empresa na barra superior.
 */
export async function requireOrg(): Promise<CurrentOrg> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data } = await supabase
    .from("memberships")
    .select("role, organizations(id, name, plan, trial_ends_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const org = data?.organizations as unknown as
    | { id: string; name: string; plan: string; trial_ends_at: string }
    | null
    | undefined;
  if (!data || !org) redirect("/onboarding");

  return {
    id: org.id,
    name: org.name,
    plan: org.plan,
    trialEndsAt: org.trial_ends_at,
    role: data.role as Role,
  };
}

export function trialDaysLeft(trialEndsAt: string): number {
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
