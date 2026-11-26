import Link from "next/link";
import { AvisoBanco } from "@/components/AvisoBanco";
import { Erro } from "@/components/Erro";
import { dataBR, hoje } from "@/lib/datas";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { criarGestao } from "./actions";

type Props = { searchParams: Promise<{ erro?: string }> };

type Gestao = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  units: { name: string } | null;
  cipa_members: { id: string }[];
  cipa_meetings: { id: string }[];
};

export default async function CipaPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data, error: falha }, { data: unidades }] = await Promise.all([
    supabase
      .from("cipa_mandates")
      .select("id, name, starts_on, ends_on, units(name), cipa_members(id), cipa_meetings(id)")
      .eq("organization_id", org.id)
      .order("starts_on", { ascending: false }),
    supabase.from("units").select("id, name").eq("organization_id", org.id).order("name"),
  ]);
  const gestoes = (data ?? []) as unknown as Gestao[];
  const h = hoje();

  return (
    <div>
      <h1 className="titulo">CIPA</h1>
      <p className="mt-1 text-sm text-slate-600">
        Comissão Interna de Prevenção de Acidentes e de Assédio (NR-05). Cadastre cada gestão com seus membros, registre as
        reuniões com presença e ata, e transforme as deliberações em ações. O SESMT fica em{" "}
        <Link href="/app/sesmt" className="underline">SESMT</Link>.
      </p>
      <Erro mensagem={erro} />
      <AvisoBanco erros={[falha]} script="0015_cipa_sesmt.sql" />

      <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
        {gestoes.map((g) => {
          const vigente = g.starts_on <= h && h <= g.ends_on;
          return (
            <li key={g.id} className="px-4 py-3">
              <Link href={`/app/cipa/${g.id}`} className="font-medium text-emerald-800 underline">{g.name}</Link>
              {vigente && <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">vigente</span>}
              <div className="text-slate-500">
                {dataBR(g.starts_on)} a {dataBR(g.ends_on)}
                {g.units ? ` · ${g.units.name}` : ""} · {g.cipa_members.length} membro(s) · {g.cipa_meetings.length} reunião(ões)
              </div>
            </li>
          );
        })}
        {!gestoes.length && <li className="px-4 py-6 text-center text-slate-500">Nenhuma gestão cadastrada.</li>}
      </ul>

      <details className="mt-6" open={!gestoes.length}>
        <summary className="cursor-pointer text-sm font-medium text-emerald-800">+ Nova gestão</summary>
        <form action={criarGestao} className="mt-2 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-2">
          <label>
            Nome
            <input name="nome" required className="input mt-1" placeholder="Ex.: Gestão 2026/2027" />
          </label>
          <label>
            Unidade
            <select name="unidade" className="input mt-1" defaultValue="">
              <option value="">—</option>
              {(unidades ?? []).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </label>
          <label>
            Início do mandato
            <input name="inicio" type="date" required className="input mt-1" />
          </label>
          <label>
            Fim do mandato
            <input name="fim" type="date" required className="input mt-1" />
          </label>
          <label>
            Data da eleição
            <input name="eleicao" type="date" className="input mt-1" />
          </label>
          <label>
            Observações
            <input name="obs" className="input mt-1" />
          </label>
          <div className="sm:col-span-2">
            <button className="btn">Criar gestão</button>
            <span className="ml-3 text-xs text-slate-500">O mandato da CIPA é de 1 ano (NR-05).</span>
          </div>
        </form>
      </details>
    </div>
  );
}
