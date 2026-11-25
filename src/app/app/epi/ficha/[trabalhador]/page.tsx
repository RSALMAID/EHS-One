import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { dataBR, MOTIVOS } from "@/lib/epi";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ trabalhador: string }> };

type Linha = {
  id: string;
  delivered_on: string;
  quantity: number;
  reason: string;
  ca_number: string | null;
  signature_name: string;
  signed_at: string;
  ppe_items: { name: string } | null;
};

export default async function FichaEpiPage({ params }: Props) {
  const { trabalhador } = await params;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: t }, { data: entregas }] = await Promise.all([
    supabase
      .from("workers")
      .select("id, full_name, cpf, hired_at, sectors(name), job_roles(name)")
      .eq("id", trabalhador)
      .maybeSingle(),
    supabase
      .from("ppe_deliveries")
      .select("id, delivered_on, quantity, reason, ca_number, signature_name, signed_at, ppe_items(name)")
      .eq("worker_id", trabalhador)
      .order("delivered_on"),
  ]);
  if (!t) notFound();
  const w = t as unknown as {
    full_name: string;
    cpf: string | null;
    hired_at: string | null;
    sectors: { name: string } | null;
    job_roles: { name: string } | null;
  };
  const linhas = (entregas ?? []) as unknown as Linha[];

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href="/app/epi/entregas" className="text-sm text-emerald-700 underline">← Entregas</Link>
        <BotaoImprimir />
      </div>
      <h1 className="mt-3 text-2xl font-bold">Ficha de controle de EPI</h1>
      <p className="text-sm text-slate-600">{org.name}</p>
      <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
        <p><strong>Trabalhador:</strong> {w.full_name}</p>
        <p><strong>CPF:</strong> {w.cpf ?? "—"}</p>
        <p><strong>Cargo:</strong> {w.job_roles?.name ?? "—"}</p>
        <p><strong>Setor:</strong> {w.sectors?.name ?? "—"}</p>
        <p><strong>Admissão:</strong> {dataBR(w.hired_at)}</p>
      </div>

      <table className="mt-4 w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-slate-300 bg-slate-100">
            {["Data", "EPI", "CA", "Qtd.", "Motivo", "Assinatura (nome digitado)", "Assinado em"].map((h) => (
              <th key={h} className="px-2 py-1 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((e) => (
            <tr key={e.id} className="border-b border-slate-200">
              <td className="px-2 py-1">{dataBR(e.delivered_on)}</td>
              <td className="px-2 py-1">{e.ppe_items?.name}</td>
              <td className="px-2 py-1">{e.ca_number ?? "—"}</td>
              <td className="px-2 py-1">{e.quantity}</td>
              <td className="px-2 py-1">{MOTIVOS[e.reason] ?? e.reason}</td>
              <td className="px-2 py-1">{e.signature_name}</td>
              <td className="px-2 py-1">{new Date(e.signed_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
            </tr>
          ))}
          {!linhas.length && (
            <tr><td colSpan={7} className="px-2 py-4 text-center text-slate-500">Nenhuma entrega registrada.</td></tr>
          )}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-slate-500">
        Em cada entrega o trabalhador declarou ter recebido o EPI gratuitamente, ter sido orientado sobre uso, guarda e
        conservação, e se comprometeu a usá-lo (NR-6).
      </p>
    </div>
  );
}
