import Link from "next/link";
import { Erro } from "@/components/Erro";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { criarModelo, criarModelosExemplo, usarModeloBiblioteca } from "../actions";
import { AvisoBanco } from "@/components/AvisoBanco";
import { type ConteudoChecklist } from "@/lib/inspecao";

type Props = { searchParams: Promise<{ erro?: string }> };

export default async function ModelosPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: modelos }, { data: biblioteca, error: falha }] = await Promise.all([
    supabase
      .from("checklist_templates")
      .select("id, name, description, active, library_code, checklist_items(count)")
      .eq("organization_id", org.id)
      .order("active", { ascending: false })
      .order("name"),
    supabase.from("model_library").select("code, title, category, content").eq("kind", "checklist").order("sort"),
  ]);
  const lista = (modelos ?? []) as unknown as {
    id: string;
    name: string;
    description: string | null;
    active: boolean;
    library_code: string | null;
    checklist_items: { count: number }[];
  }[];
  const usados = new Set(lista.map((m) => m.library_code).filter(Boolean));
  const categorias = new Map<string, { code: string; title: string; itens: number }[]>();
  for (const b of biblioteca ?? []) {
    const c = b.category ?? "Outros";
    if (!categorias.has(c)) categorias.set(c, []);
    categorias.get(c)!.push({ code: b.code, title: b.title, itens: (b.content as ConteudoChecklist).itens?.length ?? 0 });
  }

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

      <h2 id="biblioteca" className="mt-10 text-lg font-semibold text-slate-900">Biblioteca EHS One</h2>
      <p className="subtitulo">
        Checklists prontos de equipamentos, com resposta Sim, Não ou N/A. &quot;Não&quot; exige observação e vira ação. Ao usar,
        uma cópia entra na sua lista e pode ser editada.
      </p>
      <AvisoBanco erros={[falha]} script="0020_modelos_inspecao.sql" />
      <div className="mt-4 space-y-5">
        {[...categorias].map(([cat, itens]) => (
          <div key={cat}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{cat}</h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {itens.map((b) => (
                <li key={b.code} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-900">{b.title}</span>
                    <span className="text-xs text-slate-500">{b.code} · {b.itens} itens</span>
                  </span>
                  {usados.has(b.code) ? (
                    <span className="shrink-0 text-xs text-emerald-700">na sua lista</span>
                  ) : (
                    <form action={usarModeloBiblioteca}>
                      <input type="hidden" name="codigo" value={b.code} />
                      <button className="btn-ghost shrink-0 px-3 py-1 text-xs">Usar</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
