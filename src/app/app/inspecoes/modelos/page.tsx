import Link from "next/link";
import { Erro } from "@/components/Erro";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { criarModelo, criarModelosExemplo } from "../actions";

type Props = { searchParams: Promise<{ erro?: string }> };

export default async function ModelosPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const { data: modelos } = await supabase
    .from("checklist_templates")
    .select("id, name, description, active, checklist_items(count)")
    .eq("organization_id", org.id)
    .order("active", { ascending: false })
    .order("name");
  const lista = (modelos ?? []) as unknown as {
    id: string;
    name: string;
    description: string | null;
    active: boolean;
    checklist_items: { count: number }[];
  }[];

  return (
    <div>
      <Link href="/app/inspecoes" className="text-sm text-emerald-700 underline">← Inspeções</Link>
      <h1 className="mt-3 text-2xl font-bold">Modelos de checklist</h1>
      <Erro mensagem={erro} />

      <form action={criarModelo} className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
        <label className="text-sm">
          Nome do modelo
          <input name="nome" required className="input mt-1" placeholder="Inspeção de empilhadeira" />
        </label>
        <label className="text-sm">
          Quando usar (opcional)
          <input name="descricao" className="input mt-1" placeholder="Diária, antes do turno" />
        </label>
        <button className="btn">Criar e adicionar perguntas</button>
      </form>

      {!lista.length && (
        <form action={criarModelosExemplo} className="mt-4 rounded-lg border border-dashed border-emerald-600 bg-emerald-50 p-4 text-sm">
          <p>Quer começar com três modelos prontos (inspeção geral, extintores e trabalho em altura)? Você pode editar depois.</p>
          <button className="btn mt-2">Criar modelos de exemplo</button>
        </form>
      )}

      <ul className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
        {lista.map((m) => (
          <li key={m.id} className={`px-4 py-2 ${m.active ? "" : "opacity-50"}`}>
            <Link href={`/app/inspecoes/modelos/${m.id}`} className="font-medium underline">{m.name}</Link> ·{" "}
            {m.checklist_items[0]?.count ?? 0} pergunta(s)
            {m.description ? ` · ${m.description}` : ""}
            {!m.active && " · fora de uso"}
          </li>
        ))}
      </ul>
    </div>
  );
}
