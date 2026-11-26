import Link from "next/link";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { hoje } from "@/lib/datas";
import { TIPOS_EVENTO } from "@/lib/eventos";
import { fmt, indicadores, MESES } from "@/lib/indicadores";
import { requireOrg } from "@/lib/org";

type Props = { searchParams: Promise<{ ano?: string }> };

function Bloco({ titulo, valor, detalhe, alerta }: { titulo: string; valor: string; detalhe?: string; alerta?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${alerta ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}>
      <p className="text-xs text-slate-500">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-slate-600">{detalhe}</p>}
    </div>
  );
}

export default async function PainelPage({ searchParams }: Props) {
  const { ano: anoParam } = await searchParams;
  const anoAtual = Number(hoje().slice(0, 4));
  const ano = Number(anoParam) >= 2000 && Number(anoParam) <= anoAtual ? Number(anoParam) : anoAtual;
  const org = await requireOrg();
  const d = await indicadores(org.id, ano);
  const maior = Math.max(1, ...d.meses.map((m) => m.comLesao));
  const piramide: [string, number][] = [
    ["Acidente com afastamento", d.porTipo.acidente_com_afastamento ?? 0],
    ["Acidente sem afastamento", d.porTipo.acidente_sem_afastamento ?? 0],
    ["Primeiros socorros", d.porTipo.primeiros_socorros ?? 0],
    ["Incidentes e quase acidentes", (d.porTipo.incidente ?? 0) + (d.porTipo.quase_acidente ?? 0)],
    ["Desvios", (d.porTipo.desvio_seguranca ?? 0) + (d.porTipo.desvio_ambiental ?? 0)],
  ];
  const maxPiramide = Math.max(1, ...piramide.map(([, n]) => n));
  const exportar = (tipo: string) => `/painel/exportar?tipo=${tipo}&ano=${ano}`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="titulo">Indicadores de {ano}</h1>
        <div className="flex items-center gap-2 text-sm print:hidden">
          {[anoAtual - 2, anoAtual - 1, anoAtual].map((a) => (
            <Link
              key={a}
              href={`/painel?ano=${a}`}
              className={`rounded-full border px-3 py-1 ${a === ano ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-slate-300"}`}
            >
              {a}
            </Link>
          ))}
          <BotaoImprimir />
        </div>
      </div>
      {!d.total.hht && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 print:hidden">
          Sem HHT lançado em {ano}, as taxas não podem ser calculadas. Lance as horas em{" "}
          <Link href="/app/hht" className="underline">Gestão › HHT</Link>.
        </p>
      )}
      {d.total.hht && d.total.mesesSemHht > 0 && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 print:hidden">
          {d.total.mesesSemHht} mês(es) com acidente não têm HHT lançado: a taxa do ano fica maior do que a real.{" "}
          <Link href="/app/hht" className="underline">Lançar HHT</Link>.
        </p>
      )}

      <section className="mt-5 grid gap-3 sm:grid-cols-4">
        <Bloco titulo="Taxa de frequência (TF)" valor={fmt(d.tf)} detalhe={`${d.total.comLesao} acidente(s) com lesão`} />
        <Bloco titulo="Taxa de gravidade (TG)" valor={fmt(d.tg, 0)} detalhe={`${d.total.dias} dia(s) perdidos e debitados`} />
        <Bloco titulo="Acidentes com afastamento" valor={String(d.total.comAfastamento)} alerta={d.total.comAfastamento > 0} />
        <Bloco titulo="HHT do ano" valor={fmt(d.total.hht, 0)} />
      </section>
      <p className="mt-2 text-xs text-slate-500">
        TF = acidentes com lesão × 1.000.000 ÷ HHT. TG = (dias perdidos + dias debitados) × 1.000.000 ÷ HHT (NBR 14280).
      </p>

      <section className="mt-6 grid gap-3 sm:grid-cols-4">
        <Bloco titulo="Ações em aberto" valor={String(d.acoes.abertas)} detalhe={`${d.acoes.concluidasNoAno} concluída(s) em ${ano}`} />
        <Bloco titulo="Ações atrasadas" valor={String(d.acoes.atrasadas)} alerta={d.acoes.atrasadas > 0} />
        <Bloco
          titulo="Inspeções concluídas"
          valor={String(d.inspecoes.concluidas)}
          detalhe={
            d.inspecoes.conformidade === null
              ? undefined
              : `${d.inspecoes.conformidade}% de conformidade · ${d.inspecoes.naoConformidades} não conformidade(s)`
          }
        />
        <Bloco titulo="DDS realizados" valor={String(d.dds.realizados)} detalhe={`${d.dds.presencas} presença(s) confirmada(s)`} />
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">Acidentes com lesão por mês</h2>
        <div className="mt-3 flex h-40 items-end gap-1 border-b border-slate-300" role="img" aria-label="Acidentes com lesão por mês">
          {d.meses.map((m) => (
            <div key={m.mes} className="group flex h-full flex-1 flex-col items-center justify-end">
              {m.comLesao > 0 && <span className="text-xs text-slate-700">{m.comLesao}</span>}
              <div
                className="w-full max-w-8 rounded-t bg-emerald-600 group-hover:bg-emerald-700"
                style={{ height: `${(m.comLesao / maior) * 85}%`, minHeight: m.comLesao ? 4 : 0 }}
                title={`${MESES[m.mes]}: ${m.comLesao} acidente(s) com lesão · TF ${fmt(m.tf)} · TG ${fmt(m.tg, 0)}`}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-1">
          {MESES.map((nome) => (
            <span key={nome} className="flex-1 text-center text-xs text-slate-500">{nome}</span>
          ))}
        </div>
      </section>

      <section className="mt-8 overflow-x-auto">
        <h2 className="font-semibold">Mês a mês</h2>
        <table className="mt-2 w-full border-collapse bg-white text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-right text-xs text-slate-500">
              <th className="px-2 py-1 text-left">Mês</th>
              <th className="px-2 py-1">Trabalhadores</th>
              <th className="px-2 py-1">HHT</th>
              <th className="px-2 py-1">Com lesão</th>
              <th className="px-2 py-1">Com afastamento</th>
              <th className="px-2 py-1">Dias</th>
              <th className="px-2 py-1">TF</th>
              <th className="px-2 py-1">TG</th>
            </tr>
          </thead>
          <tbody>
            {d.meses.map((m) => (
              <tr key={m.mes} className="border-b border-slate-100 text-right">
                <td className="px-2 py-1 text-left">{MESES[m.mes]}</td>
                <td className="px-2 py-1">{m.trabalhadores ?? "—"}</td>
                <td className="px-2 py-1">{fmt(m.hht, 0)}</td>
                <td className="px-2 py-1">{m.comLesao}</td>
                <td className="px-2 py-1">{m.comAfastamento}</td>
                <td className="px-2 py-1">{m.dias}</td>
                <td className="px-2 py-1">{fmt(m.tf)}</td>
                <td className="px-2 py-1">{fmt(m.tg, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">Pirâmide de eventos</h2>
        <p className="text-xs text-slate-500">Muitos relatos de desvios e quase acidentes na base é sinal de boa cultura de segurança.</p>
        <ul className="mt-3 space-y-1 text-sm">
          {piramide.map(([nome, n]) => (
            <li key={nome} className="flex items-center gap-3">
              <span className="w-56 shrink-0 text-slate-700">{nome}</span>
              <span className="h-4 rounded-r bg-emerald-600" style={{ width: `${(n / maxPiramide) * 60}%`, minWidth: n ? 4 : 0 }} />
              <span className="text-slate-700">{n}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          Outros: {Object.entries(d.porTipo)
            .filter(([k]) => k === "ambiental")
            .map(([k, n]) => `${TIPOS_EVENTO[k].nome}: ${n}`)
            .join(" · ") || "nenhum evento ambiental"}
        </p>
      </section>

      <section className="mt-8 print:hidden">
        <h2 className="font-semibold">Exportar (abre no Excel)</h2>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          <a href={exportar("indicadores")} className="btn-ghost">Indicadores mês a mês</a>
          <a href={exportar("eventos")} className="btn-ghost">Eventos de {ano}</a>
          <a href={exportar("acoes")} className="btn-ghost">Ações</a>
          <a href={exportar("hht")} className="btn-ghost">HHT</a>
        </div>
      </section>
    </div>
  );
}
