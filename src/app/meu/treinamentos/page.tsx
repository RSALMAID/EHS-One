import { dataBR } from "@/lib/datas";
import { meusDados } from "@/lib/meu";
import { ROTULO, rotuloTreinamento } from "@/lib/treinamento";

export default async function MeusTreinamentos() {
  const { obrigatorios, historico } = await meusDados();

  return (
    <div>
      <h1 className="text-xl font-bold">Meus treinamentos</h1>

      <h2 className="mt-4 font-semibold">Exigidos para o meu cargo</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {obrigatorios.map(({ t, s }) => (
          <li key={t.id} className="px-4 py-3">
            <p className="font-medium">{rotuloTreinamento(t)}</p>
            <p className="mt-1">
              <span className={`rounded px-1.5 py-0.5 text-xs ${ROTULO[s.tipo].classe}`}>{ROTULO[s.tipo].texto}</span>
              {s.tipo !== "nunca" && (
                <span className="ml-2 text-slate-600">
                  feito em {dataBR(s.feito)}
                  {s.vence ? `, vale até ${dataBR(s.vence)}` : ""}
                </span>
              )}
            </p>
          </li>
        ))}
        {!obrigatorios.length && <li className="px-4 py-4 text-center text-slate-500">Nenhum exigido.</li>}
      </ul>

      <h2 className="mt-6 font-semibold">Histórico</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {historico.map((h, i) => (
          <li key={i} className="px-4 py-3">
            <p className="font-medium">{h.nome}</p>
            <p className="text-slate-600">
              {dataBR(h.held_on)}
              {h.instructor ? ` · ${h.instructor}` : ""} · {h.approved ? "aprovado" : "não aprovado / faltou"}
            </p>
          </li>
        ))}
        {!historico.length && <li className="px-4 py-4 text-center text-slate-500">Nenhuma turma ainda.</li>}
      </ul>
    </div>
  );
}
