import Link from "next/link";
import { Erro } from "@/components/Erro";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { adicionarSetor, removerSetor } from "./actions";

type Props = { searchParams: Promise<{ erro?: string }> };

export default async function SetoresPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: unidades }, { data: setores }, { data: trabalhadores }] = await Promise.all([
    supabase.from("units").select("id, name").eq("organization_id", org.id).order("name"),
    supabase.from("sectors").select("id, name, unit_id").eq("organization_id", org.id).order("name"),
    supabase.from("workers").select("sector_id").eq("organization_id", org.id).eq("active", true),
  ]);
  const pessoas = (id: string) => (trabalhadores ?? []).filter((t) => t.sector_id === id).length;

  return (
    <div>
      <h1 className="text-2xl font-bold">Setores</h1>
      <p className="mt-1 text-sm text-slate-600">Áreas dentro de cada unidade: Produção, Manutenção, Administrativo…</p>
      <Erro mensagem={erro} />

      {!unidades?.length ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
          Cadastre primeiro uma unidade em <Link href="/app/empresa" className="text-emerald-700 underline">Empresa e unidades</Link>.
        </p>
      ) : (
        <>
          <form action={adicionarSetor} className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
            <label className="text-sm">
              Unidade
              <select name="unidade" required className="input mt-1">
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Nome do setor
              <input name="nome" required className="input mt-1" placeholder="Manutenção" />
            </label>
            <button className="btn">Adicionar</button>
          </form>

          <div className="mt-6 space-y-4">
            {unidades.map((u) => {
              const lista = (setores ?? []).filter((s) => s.unit_id === u.id);
              return (
                <section key={u.id}>
                  <h2 className="font-semibold">{u.name}</h2>
                  <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                    {lista.map((s) => (
                      <li key={s.id} className="flex items-center justify-between px-4 py-2 text-sm">
                        <span>
                          {s.name} <span className="text-slate-500">· {pessoas(s.id)} trabalhador(es)</span>
                        </span>
                        <form action={removerSetor}>
                          <input type="hidden" name="id" value={s.id} />
                          <button className="text-xs text-red-600 hover:underline">Remover</button>
                        </form>
                      </li>
                    ))}
                    {!lista.length && <li className="px-4 py-4 text-sm text-slate-500">Nenhum setor.</li>}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
