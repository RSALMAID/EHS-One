import { Erro } from "@/components/Erro";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { adicionarUnidade, removerUnidade, salvarEmpresa } from "./actions";

type Props = { searchParams: Promise<{ erro?: string }> };

export default async function EmpresaPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: empresa }, { data: unidades }, { data: setores }] = await Promise.all([
    supabase.from("organizations").select("name, cnpj, segment, employee_count").eq("id", org.id).single(),
    supabase.from("units").select("id, name, address").eq("organization_id", org.id).order("name"),
    supabase.from("sectors").select("unit_id").eq("organization_id", org.id),
  ]);
  const setoresPorUnidade = (id: string) => (setores ?? []).filter((s) => s.unit_id === id).length;
  const podeEditar = org.role === "proprietario";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="titulo">Empresa e unidades</h1>
        <Erro mensagem={erro} />
      </div>

      <section>
        <h2 className="font-semibold">Dados da empresa</h2>
        <form action={salvarEmpresa} className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:grid-cols-2">
          <label className="text-sm">
            Razão social / nome
            <input name="nome" required defaultValue={empresa?.name ?? ""} className="input mt-1" disabled={!podeEditar} />
          </label>
          <label className="text-sm">
            CNPJ
            <input name="cnpj" defaultValue={empresa?.cnpj ?? ""} className="input mt-1" disabled={!podeEditar} />
          </label>
          <label className="text-sm">
            Segmento
            <input name="segmento" defaultValue={empresa?.segment ?? ""} className="input mt-1" disabled={!podeEditar} />
          </label>
          <label className="text-sm">
            Número de trabalhadores
            <input name="funcionarios" type="number" min={1} defaultValue={empresa?.employee_count ?? ""} className="input mt-1" disabled={!podeEditar} />
          </label>
          {podeEditar ? (
            <div><button className="btn">Salvar</button></div>
          ) : (
            <p className="text-sm text-slate-500">Só o proprietário altera os dados da empresa.</p>
          )}
        </form>
      </section>

      <section>
        <h2 className="font-semibold">Unidades</h2>
        <p className="text-sm text-slate-600">Locais de trabalho: matriz, filiais, obras, galpões.</p>
        <form action={adicionarUnidade} className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <label className="text-sm">
            Nome
            <input name="nome" required className="input mt-1" placeholder="Matriz" />
          </label>
          <label className="text-sm">
            Endereço (opcional)
            <input name="endereco" className="input mt-1" />
          </label>
          <button className="btn">Adicionar</button>
        </form>
        <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
          {(unidades ?? []).map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-slate-500">
                  {u.address ?? "Sem endereço"} · {setoresPorUnidade(u.id)} setor(es)
                </p>
              </div>
              <form action={removerUnidade}>
                <input type="hidden" name="id" value={u.id} />
                <button className="text-xs text-red-600 hover:underline">Remover</button>
              </form>
            </li>
          ))}
          {!unidades?.length && <li className="px-4 py-6 text-center text-sm text-slate-500">Nenhuma unidade ainda.</li>}
        </ul>
        <p className="mt-2 text-xs text-slate-500">Remover uma unidade remove também os setores dela.</p>
      </section>
    </div>
  );
}
