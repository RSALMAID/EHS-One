export function Erro({ mensagem }: { mensagem?: string }) {
  if (!mensagem) return null;
  return <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{mensagem}</p>;
}
