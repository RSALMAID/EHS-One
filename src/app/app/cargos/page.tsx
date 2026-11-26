import { Erro } from "@/components/Erro";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { adicionarCargo, removerCargo } from "./actions";

type Props = { searchParams: Promise<{ erro?: string }> };

export default async function CargosPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: cargos }, { data: trabalhadores }] = await Promise.all([
    supabase.from("job_roles").select("id, name, description").eq("organization_id", org.id).order("name"),
    supabase.from("workers").select("job_role_id").eq("organization_id", org.id).eq("active", true),
  ]);
  const pessoas = (id: string) => (trabalhadores ?? []).filter((t) => t.job_role_id === id).length;

  return (
    <div>
      <h1 className="titulo">Cargos e funções</h1>
      <p className="mt-1 text-sm text-slate-600">
        A descrição das atividades do cargo será usada no PGR e na matriz de treinamentos.
      </p>
      <Erro mensagem={erro} />

      <form action={adicionarCargo} className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
        <label className="text-sm">
          Cargo / função
          <input name="nome" required className="input mt-1" placeholder="Soldador" />
        </label>
        <label className="text-sm">
          Atividades que realiza (opcional)
          <input name="descricao" className="input mt-1" placeholder="Solda MIG, esmerilhamento, corte de chapas" />
        </label>
        <button className="btn">Adicionar</button>
      </form>

      <ul className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
        {(cargos ?? []).map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-3 px-4 py-2 text-sm">
            <div>
              <p className="font-medium">
                {c.name} <span className="font-normal text-slate-500">· {pessoas(c.id)} trabalhador(es)</span>
              </p>
              {c.description && <p className="text-slate-600">{c.description}</p>}
            </div>
            <form action={removerCargo}>
              <input type="hidden" name="id" value={c.id} />
              <button className="text-xs text-red-600 hover:underline">Remover</button>
            </form>
          </li>
        ))}
        {!cargos?.length && <li className="px-4 py-6 text-center text-sm text-slate-500">Nenhum cargo ainda.</li>}
      </ul>
    </div>
  );
}
