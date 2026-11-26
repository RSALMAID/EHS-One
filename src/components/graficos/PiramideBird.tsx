type Nivel = { nome: string; n: number };

const TONS = ["bg-sky-900 text-white", "bg-sky-800 text-white", "bg-sky-600 text-white", "bg-sky-300 text-slate-900", "bg-sky-100 text-slate-900"];

/**
 * Pirâmide de Bird: do mais grave (topo) ao mais frequente (base).
 * A forma é fixa (é o conceito); os números são os registros do período.
 */
export function PiramideBird({ niveis }: { niveis: Nivel[] }) {
  return (
    <div className="space-y-1" role="list" aria-label="Pirâmide de Bird">
      {niveis.map((n, i) => (
        <div key={n.nome} role="listitem" className="flex items-center gap-3">
          <div className="flex flex-1 justify-center">
            <div
              className={`flex h-9 items-center justify-center rounded-md text-sm font-semibold ${TONS[i] ?? TONS[TONS.length - 1]}`}
              style={{ width: `${28 + (i * 72) / Math.max(1, niveis.length - 1)}%` }}
            >
              {n.n}
            </div>
          </div>
          <span className="w-44 shrink-0 text-xs text-slate-600">{n.nome}</span>
        </div>
      ))}
    </div>
  );
}
