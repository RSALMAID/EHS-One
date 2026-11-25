const DIA = 86_400_000;

/** Data de hoje (YYYY-MM-DD) no fuso de Brasília. */
export function hoje(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function diasAte(data: string): number {
  return Math.round((Date.parse(data) - Date.parse(hoje())) / DIA);
}

export function somarDias(data: string, dias: number): string {
  return new Date(Date.parse(data) + dias * DIA).toISOString().slice(0, 10);
}

export function somarMeses(data: string, meses: number): string {
  const d = new Date(Date.parse(data));
  const dia = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + meses);
  const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dia, ultimo));
  return d.toISOString().slice(0, 10);
}

export function dataBR(data: string | null): string {
  if (!data) return "—";
  const [a, m, d] = data.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}
