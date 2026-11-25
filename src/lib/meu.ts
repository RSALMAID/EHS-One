import { requireOrg } from "./org";
import { createClient } from "./supabase/server";
import { situacao, type Participacao, type Treinamento } from "./treinamento";

/** Dados do próprio trabalhador logado, usados nas telas do Meu EHS. */
export async function meusDados() {
  const org = await requireOrg();
  const supabase = await createClient();
  const wid = org.workerId!;
  const [{ data: ficha }, { data: entregas }, { data: presencas }, { data: asos }] = await Promise.all([
    supabase.from("workers").select("id, full_name, job_role_id, job_roles(name), sectors(name)").eq("id", wid).single(),
    supabase
      .from("ppe_deliveries")
      .select("id, delivered_on, quantity, ca_number, signature_name, confirmed_at, ppe_items(name)")
      .eq("worker_id", wid)
      .order("delivered_on", { ascending: false }),
    supabase
      .from("training_attendances")
      .select("approved, training_sessions(training_id, held_on, instructor)")
      .eq("worker_id", wid),
    supabase
      .from("asos")
      .select("id, kind, issued_on, result, restrictions, next_due")
      .eq("worker_id", wid)
      .order("issued_on", { ascending: false }),
  ]);
  const w = ficha as unknown as {
    id: string;
    full_name: string;
    job_role_id: string | null;
    job_roles: { name: string } | null;
    sectors: { name: string } | null;
  };
  const [{ data: exigidos }, { data: treinamentos }] = await Promise.all([
    w.job_role_id
      ? supabase.from("training_job_roles").select("training_id").eq("job_role_id", w.job_role_id)
      : Promise.resolve({ data: [] as { training_id: string }[] }),
    supabase
      .from("trainings")
      .select("id, name, norm_reference, workload_hours, validity_months, active")
      .eq("organization_id", org.id),
  ]);
  const pres = (presencas ?? []) as unknown as {
    approved: boolean;
    training_sessions: { training_id: string; held_on: string; instructor: string | null } | null;
  }[];
  const participacoes: Participacao[] = pres
    .filter((p) => p.approved && p.training_sessions)
    .map((p) => ({ worker_id: wid, training_id: p.training_sessions!.training_id, held_on: p.training_sessions!.held_on }));
  const lista = (treinamentos ?? []) as Treinamento[];
  const obrigatorios = lista
    .filter((t) => t.active && (exigidos ?? []).some((e) => e.training_id === t.id))
    .map((t) => ({ t, s: situacao(t, participacoes, wid) }));

  return {
    org,
    trabalhador: w,
    entregas: (entregas ?? []) as unknown as {
      id: string;
      delivered_on: string;
      quantity: number;
      ca_number: string | null;
      signature_name: string | null;
      confirmed_at: string | null;
      ppe_items: { name: string } | null;
    }[],
    obrigatorios,
    historico: pres
      .filter((p) => p.training_sessions)
      .map((p) => ({ ...p.training_sessions!, approved: p.approved, nome: lista.find((t) => t.id === p.training_sessions!.training_id)?.name ?? "" }))
      .sort((a, b) => (a.held_on < b.held_on ? 1 : -1)),
    asos: asos ?? [],
  };
}
