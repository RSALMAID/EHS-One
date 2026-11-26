"use client";

import { useState } from "react";

type Ponto = { mes: string; a: number; b: number };

/** Barras empilhadas por mês (duas séries), com dica ao passar o mouse e tabela para leitura. */
export function BarrasMes({ dados, serieA, serieB }: { dados: Ponto[]; serieA: string; serieB: string }) {
  const [foco, setFoco] = useState<number | null>(null);
  const W = 600;
  const H = 200;
  const esq = 28;
  const base = H - 22;
  const topo = 10;
  const maxBruto = Math.max(1, ...dados.map((d) => d.a + d.b));
  const passo = Math.max(1, Math.ceil(maxBruto / 4));
  const max = passo * 4;
  const y = (v: number) => base - (v / max) * (base - topo);
  const larg = (W - esq) / dados.length;
  const barra = Math.min(28, larg * 0.6);
  const total = dados.reduce((s, d) => s + d.a + d.b, 0);
  const d = foco === null ? null : dados[foco];

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-serie-1" />{serieA}</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-serie-2" />{serieB}</span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${serieA} e ${serieB} por mês: ${total} no total`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line x1={esq} x2={W} y1={y(passo * i)} y2={y(passo * i)} stroke="var(--color-slate-200)" strokeWidth={1} />
              <text x={esq - 6} y={y(passo * i) + 4} textAnchor="end" className="fill-slate-400 text-[11px]">{passo * i}</text>
            </g>
          ))}
          {dados.map((p, i) => {
            const cx = esq + larg * i + larg / 2;
            const ya = y(p.a);
            const yb = y(p.a + p.b);
            return (
              <g key={p.mes} onMouseEnter={() => setFoco(i)} onMouseLeave={() => setFoco(null)}>
                <rect x={esq + larg * i} y={topo} width={larg} height={base - topo} fill={foco === i ? "var(--color-slate-100)" : "transparent"} />
                {p.a > 0 && <rect x={cx - barra / 2} y={ya} width={barra} height={base - ya} rx={p.b ? 0 : 4} fill="var(--serie-1)" />}
                {p.b > 0 && <rect x={cx - barra / 2} y={yb} width={barra} height={Math.max(0, ya - yb - (p.a ? 2 : 0))} rx={4} fill="var(--serie-2)" />}
                <text x={cx} y={H - 6} textAnchor="middle" className="fill-slate-500 text-[11px]">{p.mes}</text>
              </g>
            );
          })}
          <line x1={esq} x2={W} y1={base} y2={base} stroke="var(--color-slate-300)" strokeWidth={1} />
        </svg>
        {d && (
          <div
            className="pointer-events-none absolute top-0 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
            style={{ left: `${((esq + larg * foco! + larg / 2) / W) * 100}%`, transform: "translateX(-50%)" }}
          >
            <p className="font-semibold text-slate-900">{d.mes}</p>
            <p className="text-slate-600">{serieA}: {d.a}</p>
            <p className="text-slate-600">{serieB}: {d.b}</p>
          </div>
        )}
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-slate-500">Ver em tabela</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-slate-500"><tr><th className="py-1">Mês</th><th>{serieA}</th><th>{serieB}</th></tr></thead>
          <tbody className="text-slate-700">
            {dados.map((p) => <tr key={p.mes} className="border-t border-slate-100"><td className="py-1">{p.mes}</td><td>{p.a}</td><td>{p.b}</td></tr>)}
          </tbody>
        </table>
      </details>
    </div>
  );
}
