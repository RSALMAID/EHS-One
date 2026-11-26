import { dataBR } from "@/lib/datas";
import { meusDados } from "@/lib/meu";
import { RESULTADOS, TIPOS_ASO } from "@/lib/saude";

export default async function MinhaSaude() {
  const { asos } = await meusDados();

  return (
    <div>
      <h1 className="text-xl font-bold">Meus ASOs</h1>
      <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
        {asos.map((a) => (
          <li key={a.id} className="px-4 py-3">
            <p className="font-medium">
              {TIPOS_ASO[a.kind]} · {dataBR(a.issued_on)}
            </p>
            <p>
              <span className={RESULTADOS[a.result].classe}>{RESULTADOS[a.result].texto}</span>
              {a.restrictions ? ` · ${a.restrictions}` : ""}
            </p>
            {a.next_due && <p className="text-slate-600">Próximo exame: {dataBR(a.next_due)}</p>}
          </li>
        ))}
        {!asos.length && <li className="px-4 py-4 text-center text-slate-500">Nenhum ASO registrado.</li>}
      </ul>
    </div>
  );
}
