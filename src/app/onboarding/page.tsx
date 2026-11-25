import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { criarEmpresa } from "./actions";

type Props = { searchParams: Promise<{ erro?: string }> };

export default async function OnboardingPage({ searchParams }: Props) {
  const { erro } = await searchParams;

  // Quem já tem empresa vai direto para o sistema, sem criar outra.
  if (!erro) {
    const supabase = await createClient();
    const { data: membro } = await supabase
      .from("memberships")
      .select("organization_id")
      .limit(1)
      .maybeSingle();
    if (membro) redirect("/app");
    // Convidado pela empresa: entra sem criar outra empresa.
    const { data: aceitos } = await supabase.rpc("accept_invitations");
    if (aceitos) redirect("/app");
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <p className="text-sm font-medium text-emerald-700">Passo 1 de 2</p>
      <h1 className="mt-1 text-2xl font-bold">Sua empresa</h1>
      <p className="mt-2 text-sm text-slate-600">
        Com esses dados criamos seu ambiente. O CNPJ é opcional durante o teste. No próximo passo
        (em breve) faremos as perguntas sobre sua operação para montar o diagnóstico inicial.
      </p>
      {erro && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
      <form action={criarEmpresa} className="mt-6 space-y-4">
        <label className="block text-sm">
          Nome da empresa
          <input name="nome" required className="input mt-1" placeholder="Oficina Silva" />
        </label>
        <label className="block text-sm">
          CNPJ (opcional)
          <input name="cnpj" className="input mt-1" inputMode="numeric" />
        </label>
        <label className="block text-sm">
          Segmento
          <input name="segmento" className="input mt-1" placeholder="Manutenção industrial" />
        </label>
        <label className="block text-sm">
          Número de trabalhadores
          <input name="funcionarios" type="number" min={1} className="input mt-1" />
        </label>
        <button className="btn w-full">Criar meu ambiente</button>
      </form>
    </main>
  );
}
