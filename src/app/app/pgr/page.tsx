import Link from "next/link";
import { Erro } from "@/components/Erro";
import { requireOrg } from "@/lib/org";
import { classificar } from "@/lib/risco";
import { createClient } from "@/lib/supabase/server";
import { adicionarAtividade, adicionarProcesso, removerAtividade, removerProcesso } from "./actions";

type Props = { searchParams: Promise<{ erro?: string }> };

export default async function PgrPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: unidades }, { data: setores }, { data: processos }, { data: atividades }, { data: riscos }] =
    await Promise.all([
      supabase.from("units").select("id, name").eq("organization_id", org.id).order("name"),
      supabase.from("sectors").select("id, name, unit_id").eq("organization_id", org.id).order("name"),
      supabase.from("processes").select("id, name, sector_id").eq("organization_id", org.id).order("name"),
      supabase.from("activities").select("id, name, process_id").eq("organization_id", org.id).order("name"),
      supabase.from("risks").select("activity_id, level").eq("organization_id", org.id),
    ]);

  const resumo = (atividadeId: string) => {
    const rs = (riscos ?? []).filter((r) => r.activity_id === atividadeId);
    const max = Math.max(0, ...rs.map((r) => r.level ?? 0));
    return { total: rs.length, pior: rs.length ? classificar(max) : null };
  };
  const contagem = ["Crítico", "Alto", "Moderado", "Baixo"].map((nome) => ({
    nome,
    n: (riscos ?? []).filter((r) => classificar(r.level).nome === nome).length,
  }));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo">GRO / PGR</h1>
          <p className="mt-1 text-sm text-slate-600">
            Setor → processo → atividade → riscos. Cada risco avaliado entra no Inventário.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/pgr/mapa" className="btn-ghost">Mapa de riscos</Link>
          <Link href="/app/pgr/inventario" className="btn-ghost">Inventário de riscos</Link>
        </div>
      </div>
      <Erro mensagem={erro} />

      <p className="mt-4 text-sm text-slate-700">
        {(riscos ?? []).length} riscos: {contagem.map((c) => `${c.n} ${c.nome.toLowerCase()}`).join(" · ")}
      </p>

      {!setores?.length && (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
          Cadastre unidades e setores primeiro em <Link href="/app/empresa" className="text-emerald-700 underline">Empresa</Link> e{" "}
          <Link href="/app/setores" className="text-emerald-700 underline">Setores</Link>.
        </p>
      )}

      <div className="mt-6 space-y-6">
        {(unidades ?? []).map((u) =>
          (setores ?? [])
            .filter((s) => s.unit_id === u.id)
            .map((s) => {
              const procs = (processos ?? []).filter((p) => p.sector_id === s.id);
              return (
                <section key={s.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                  <h2 className="font-semibold">
                    {u.name} › {s.name}
                  </h2>
                  {procs.map((p) => {
                    const ativs = (atividades ?? []).filter((a) => a.process_id === p.id);
                    return (
                      <div key={p.id} className="mt-3 border-l-2 border-slate-200 pl-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Processo: {p.name}</p>
                          <form action={removerProcesso}>
                            <input type="hidden" name="id" value={p.id} />
                            <button className="text-xs text-red-600 hover:underline">Remover processo</button>
                          </form>
                        </div>
                        <ul className="mt-1 space-y-1">
                          {ativs.map((a) => {
                            const r = resumo(a.id);
                            return (
                              <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                                <Link href={`/app/pgr/atividade/${a.id}`} className="text-emerald-700 underline">
                                  {a.name}
                                </Link>
                                <span className="flex items-center gap-3 text-xs text-slate-500">
                                  {r.total} risco(s)
                                  {r.pior && <span className={`rounded px-1.5 py-0.5 ${r.pior.cor}`}>{r.pior.nome}</span>}
                                  <form action={removerAtividade}>
                                    <input type="hidden" name="id" value={a.id} />
                                    <button className="text-red-600 hover:underline">Remover</button>
                                  </form>
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                        <form action={adicionarAtividade} className="mt-2 flex flex-wrap gap-2">
                          <input type="hidden" name="processo" value={p.id} />
                          <input name="nome" required placeholder="Nova atividade (ex.: Solda MIG)" className="input max-w-xs py-1" />
                          <input name="descricao" placeholder="Como é feita (opcional)" className="input max-w-xs py-1" />
                          <button className="btn-ghost py-1">Adicionar atividade</button>
                        </form>
                      </div>
                    );
                  })}
                  <form action={adicionarProcesso} className="mt-3 flex flex-wrap gap-2">
                    <input type="hidden" name="setor" value={s.id} />
                    <input name="nome" required placeholder="Novo processo (ex.: Caldeiraria)" className="input max-w-xs py-1" />
                    <button className="btn-ghost py-1">Adicionar processo</button>
                  </form>
                </section>
              );
            }),
        )}
      </div>
    </div>
  );
}
