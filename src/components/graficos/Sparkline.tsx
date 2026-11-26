/** Minigráfico de linha (mês a mês). Meses sem dado ficam fora da linha. */
export function Sparkline({ valores, rotulo }: { valores: (number | null)[]; rotulo: string }) {
  const W = 96;
  const H = 28;
  const nums = valores.filter((v): v is number => v !== null);
  if (nums.length < 2) return <span className="block h-7 w-24" aria-hidden />;
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  const x = (i: number) => (valores.length === 1 ? W / 2 : (i / (valores.length - 1)) * (W - 4) + 2);
  const y = (v: number) => (max === min ? H / 2 : H - 3 - ((v - min) / (max - min)) * (H - 6));
  const pontos = valores.map((v, i) => (v === null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean);
  const ultimo = valores.reduce<number>((u, v, i) => (v === null ? u : i), -1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-24 overflow-visible" role="img" aria-label={rotulo}>
      <polyline points={pontos.join(" ")} fill="none" stroke="var(--serie-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {ultimo >= 0 && <circle cx={x(ultimo)} cy={y(valores[ultimo]!)} r={2.5} fill="var(--serie-1)" stroke="var(--color-white)" strokeWidth={1.5} />}
    </svg>
  );
}
