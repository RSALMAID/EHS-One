import { Clock } from "lucide-react";
import { VazioTabela } from "@/components/EstadoVazio";
import Link from "next/link";
import { Erro } from "@/components/Erro";
import { hoje } from "@/lib/datas";
import { fmt, MESES } from "@/lib/indicadores";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { removerHht, salvarHht } from "./actions";

type Props = { searchParams: Promise<{ erro?: string }> };

export default async function HhtPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const { data } = await supabase
    .from("hht_records")
    .select("id, month, workers_count, hours_worked, notes")
    .eq("organization_id", org.id)
    .order("month", { ascending: false })
    .limit(36);
  const mesAtual = hoje().slice(0, 7);

  return (
    <div>
      <h1 className="titulo">HHT · horas-homem trabalhadas</h1>
      <p className="mt-1 text-sm text-slate-600">
        Informe todo mês quantas pessoas trabalharam e o total de horas (incluindo horas extras). É a base das taxas de
        frequência e gravidade do <Link href="/painel" className="underline">Painel</Link>. Lançar de novo o mesmo mês
        substitui o valor.
      </p>
      <Erro mensagem={erro} />

      <form action={salvarHht} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-4 sm:items-end">
        <label>
          Mês
          <input name="mes" type="month" required defaultValue={mesAtual} className="input mt-1" />
        </label>
        <label>
          Trabalhadores
          <input name="trabalhadores" type="number" min={0} required className="input mt-1" />
        </label>
        <label>
          Horas trabalhadas
          <input name="horas" required inputMode="decimal" className="input mt-1" placeholder="Ex.: 8800" />
        </label>
        <label>
          Observação
          <input name="obs" className="input mt-1" />
        </label>
        <div className="sm:col-span-4">
          <button className="btn">Salvar mês</button>
          <span className="ml-3 text-xs text-slate-500">
            Sem o controle de ponto? Estimativa: trabalhadores × dias úteis × horas por dia.
          </span>
        </div>
      </form>

      <table className="mt-6 w-full border-collapse rounded-lg bg-white text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
            <th className="px-3 py-2">Mês</th>
            <th className="px-3 py-2 text-right">Trabalhadores</th>
            <th className="px-3 py-2 text-right">HHT</th>
            <th className="px-3 py-2">Observação</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((h) => (
            <tr key={h.id} className="border-b border-slate-100">
              <td className="px-3 py-2">{MESES[Number(h.month.slice(5, 7)) - 1]}/{h.month.slice(0, 4)}</td>
              <td className="px-3 py-2 text-right">{h.workers_count}</td>
              <td className="px-3 py-2 text-right">{fmt(Number(h.hours_worked), 0)}</td>
              <td className="px-3 py-2 text-slate-600">{h.notes ?? ""}</td>
              <td className="px-3 py-2 text-right">
                <form action={removerHht}>
                  <input type="hidden" name="id" value={h.id} />
                  <button className="text-xs text-red-600 hover:underline">Excluir</button>
                </form>
              </td>
            </tr>
          ))}
          {!data?.length && (
            <VazioTabela
              colunas={5}
              icone={Clock}
              titulo="Nenhum mês lançado ainda"
              texto="Lance as horas trabalhadas de cada mês: elas são a base das taxas de frequência e de gravidade."
            />
          )}
        </tbody>
      </table>
    </div>
  );
}
