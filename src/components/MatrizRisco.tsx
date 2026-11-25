import { classificar, PROBABILIDADE, SEVERIDADE } from "@/lib/risco";

/** Quadro explicativo da matriz 5×5 (severidade × probabilidade), com a célula escolhida marcada. */
export function MatrizRisco({ severidade, probabilidade }: { severidade?: number | null; probabilidade?: number | null }) {
  const linhas = [5, 4, 3, 2, 1];
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-center text-[11px]">
        <tbody>
          {linhas.map((s) => (
            <tr key={s}>
              <th className="pr-2 text-right font-normal text-slate-600">{SEVERIDADE[s]}</th>
              {[1, 2, 3, 4, 5].map((p) => {
                const n = s * p;
                const c = classificar(n);
                const marcado = s === severidade && p === probabilidade;
                return (
                  <td key={p} className={`h-8 w-10 border border-white ${c.cor} ${marcado ? "ring-2 ring-slate-900" : ""}`}>
                    {n}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td />
            {[1, 2, 3, 4, 5].map((p) => (
              <td key={p} className="w-10 pt-1 align-top text-slate-600">{PROBABILIDADE[p].split(" · ")[1]}</td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-600">
        Severidade (linhas) × probabilidade (colunas). Baixo 1–4: manter controles · Moderado 5–9: ação planejada ·
        Alto 10–16: ação prioritária com prazo curto · Crítico 17–25: parar a atividade até controlar.
      </p>
    </div>
  );
}
