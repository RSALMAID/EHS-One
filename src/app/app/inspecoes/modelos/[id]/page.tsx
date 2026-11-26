import Link from "next/link";
import { notFound } from "next/navigation";
import { Erro } from "@/components/Erro";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { adicionarPergunta, removerModelo, removerPergunta, salvarModelo } from "../../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> };

export default async function ModeloPage({ params, searchParams }: Props) {
  const [{ id }, { erro }] = await Promise.all([params, searchParams]);
  await requireOrg();
  const supabase = await createClient();
  const [{ data: m }, { data: itens }] = await Promise.all([
    supabase.from("checklist_templates").select("id, name, description, active").eq("id", id).maybeSingle(),
    supabase.from("checklist_items").select("id, position, question").eq("template_id", id).order("position"),
  ]);
  if (!m) notFound();

  return (
    <div>
      <Link href="/app/inspecoes/modelos" className="text-sm text-emerald-700 underline">← Modelos</Link>
      <h1 className="mt-3 text-2xl font-bold">{m.name}</h1>
      <Erro mensagem={erro} />

      <form action={salvarModelo} className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:grid-cols-[1fr_2fr_auto_auto] sm:items-end">
        <input type="hidden" name="id" value={m.id} />
        <label className="text-sm">
          Nome
          <input name="nome" required defaultValue={m.name} className="input mt-1" />
        </label>
        <label className="text-sm">
          Quando usar
          <input name="descricao" defaultValue={m.description ?? ""} className="input mt-1" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked={m.active} /> Em uso
        </label>
        <button className="btn">Salvar</button>
      </form>

      <h2 className="mt-6 text-lg font-semibold">Perguntas</h2>
      <p className="text-sm text-slate-600">Escreva cada item de forma que “sim” seja o certo (Conforme).</p>
      <ol className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
        {(itens ?? []).map((i, n) => (
          <li key={i.id} className="flex items-start justify-between gap-3 px-4 py-2">
            <span>{n + 1}. {i.question}</span>
            <form action={removerPergunta}>
              <input type="hidden" name="id" value={i.id} />
              <input type="hidden" name="modelo" value={m.id} />
              <button className="text-xs text-red-600 hover:underline">Remover</button>
            </form>
          </li>
        ))}
        {!itens?.length && <li className="px-4 py-4 text-center text-slate-500">Nenhuma pergunta ainda.</li>}
      </ol>
      <form action={adicionarPergunta} className="mt-3 flex gap-2">
        <input type="hidden" name="modelo" value={m.id} />
        <input name="pergunta" required className="input" placeholder="Os extintores estão desobstruídos?" />
        <button className="btn">Adicionar</button>
      </form>

      <form action={removerModelo} className="mt-8">
        <input type="hidden" name="id" value={m.id} />
        <button className="text-xs text-red-600 hover:underline">Excluir este modelo</button>
      </form>
    </div>
  );
}
