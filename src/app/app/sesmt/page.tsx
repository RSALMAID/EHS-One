import Link from "next/link";
import { AvisoBanco } from "@/components/AvisoBanco";
import { Erro } from "@/components/Erro";
import { CARGOS_SESMT } from "@/lib/cipa";
import { dataBR, hoje } from "@/lib/datas";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { adicionarSesmt, removerSesmt, salvarSesmt } from "./actions";

type Props = { searchParams: Promise<{ erro?: string }> };

export default async function SesmtPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data, error: falha }, { data: trabalhadores }] = await Promise.all([
    supabase.from("sesmt_members").select("*").eq("organization_id", org.id).order("name"),
    supabase.from("workers").select("id, full_name").eq("organization_id", org.id).eq("active", true).order("full_name"),
  ]);
  const h = hoje();
  const lista = (data ?? []).sort((a, b) => Number(!!a.ends_on && a.ends_on < h) - Number(!!b.ends_on && b.ends_on < h));
  const ativos = lista.filter((s) => !s.ends_on || s.ends_on >= h);
  const porFuncao = Object.entries(CARGOS_SESMT)
    .map(([v, l]) => ({ l, n: ativos.filter((s) => s.role === v).length }))
    .filter((x) => x.n);

  return (
    <div>
      <h1 className="titulo">SESMT</h1>
      <p className="mt-1 text-sm text-slate-600">
        Serviço Especializado em Segurança e em Medicina do Trabalho (NR-04). Registre os profissionais, o registro
        profissional e a carga horária. O dimensionamento depende do grau de risco e do número de empregados (Anexo II da
        NR-04). A CIPA fica em <Link href="/app/cipa" className="underline">CIPA</Link>.
      </p>
      <Erro mensagem={erro} />
      <AvisoBanco erros={[falha]} script="0015_cipa_sesmt.sql" />
      {porFuncao.length > 0 && (
        <p className="mt-3 text-sm text-slate-700">Em atividade: {porFuncao.map((x) => `${x.n} ${x.l.toLowerCase()}`).join(" · ")}</p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse rounded-lg bg-white text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Função</th>
              <th className="px-3 py-2">Registro</th>
              <th className="px-3 py-2">Horas/semana</th>
              <th className="px-3 py-2">Início</th>
              <th className="px-3 py-2">Saída</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((s) => {
              const form = `sesmt-${s.id}`;
              const saiu = s.ends_on && s.ends_on < h;
              return (
                <tr key={s.id} className={`border-b border-slate-100 ${saiu ? "text-slate-400" : ""}`}>
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2">{CARGOS_SESMT[s.role]}</td>
                  <td className="px-3 py-2">
                    <input name="registro" form={form} defaultValue={s.registration ?? ""} className="input" />
                  </td>
                  <td className="px-3 py-2">
                    <input name="horas" form={form} inputMode="decimal" defaultValue={s.hours_per_week ?? ""} className="input w-20" />
                  </td>
                  <td className="px-3 py-2">
                    <input name="inicio" type="date" form={form} defaultValue={s.starts_on ?? ""} className="input" />
                  </td>
                  <td className="px-3 py-2">
                    <input name="fim" type="date" form={form} defaultValue={s.ends_on ?? ""} className="input" title={s.ends_on ? dataBR(s.ends_on) : ""} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <form id={form} action={salvarSesmt} className="inline">
                      <input type="hidden" name="id" value={s.id} />
                      <button className="text-emerald-700 underline">salvar</button>
                    </form>
                    <form action={removerSesmt} className="ml-2 inline">
                      <input type="hidden" name="id" value={s.id} />
                      <button className="text-red-700 underline">remover</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {!lista.length && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">Nenhum profissional cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form action={adicionarSesmt} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-3 sm:items-end">
        <label>
          Trabalhador cadastrado
          <select name="trabalhador" className="input mt-1" defaultValue="">
            <option value="">— (profissional externo)</option>
            {(trabalhadores ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
        </label>
        <label>
          Nome (se for externo)
          <input name="nome" className="input mt-1" />
        </label>
        <label>
          Função
          <select name="cargo" required className="input mt-1" defaultValue="">
            <option value="" disabled>Escolha…</option>
            {Object.entries(CARGOS_SESMT).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Registro (CREA, CRM, COREN, MTE)
          <input name="registro" className="input mt-1" />
        </label>
        <label>
          Horas por semana
          <input name="horas" inputMode="decimal" className="input mt-1" />
        </label>
        <label>
          Início
          <input name="inicio" type="date" className="input mt-1" />
        </label>
        <div className="sm:col-span-3">
          <button className="btn">Adicionar profissional</button>
        </div>
      </form>
    </div>
  );
}
