import Link from "next/link";
import { dataBR, diasAte } from "@/lib/datas";
import { meusDados } from "@/lib/meu";
import { RESULTADOS } from "@/lib/saude";

export default async function MeuInicio() {
  const { trabalhador, entregas, obrigatorios, asos } = await meusDados();
  const aConfirmar = entregas.filter((e) => !e.confirmed_at && !e.signature_name).length;
  const treinosPend = obrigatorios.filter((o) => o.s.tipo !== "ok").length;
  const aso = asos[0];

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Olá, {trabalhador.full_name.split(" ")[0]}</h1>
      <p className="text-sm text-slate-600">
        {trabalhador.job_roles?.name ?? "Sem cargo"}
        {trabalhador.sectors ? ` · ${trabalhador.sectors.name}` : ""}
      </p>

      <Link href="/meu/relatar" className="block rounded-lg bg-emerald-700 p-4 text-white">
        <p className="font-semibold">Relatar desvio ou quase acidente</p>
        <p className="text-sm text-emerald-50">Leva menos de um minuto, com foto</p>
      </Link>

      <Link href="/meu/acoes" className="block rounded-lg border border-slate-200 bg-white p-4">
        <p className="font-semibold">Minhas ações</p>
        <p className="text-sm">Ações do plano de ação em que você é o responsável</p>
      </Link>

      <Link href="/meu/epis" className={`block rounded-lg border p-4 ${aConfirmar ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"}`}>
        <p className="font-semibold">EPIs</p>
        <p className="text-sm">
          {aConfirmar ? `${aConfirmar} entrega(s) para você confirmar` : `${entregas.length} entrega(s) registradas`}
        </p>
      </Link>

      <Link href="/meu/treinamentos" className={`block rounded-lg border p-4 ${treinosPend ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"}`}>
        <p className="font-semibold">Treinamentos</p>
        <p className="text-sm">
          {obrigatorios.length === 0
            ? "Nenhum treinamento exigido para o seu cargo"
            : treinosPend
              ? `${treinosPend} de ${obrigatorios.length} exigidos precisam de atenção`
              : `Todos os ${obrigatorios.length} exigidos em dia`}
        </p>
      </Link>

      <Link href="/meu/saude" className="block rounded-lg border border-slate-200 bg-white p-4">
        <p className="font-semibold">Saúde (ASO)</p>
        <p className="text-sm">
          {aso ? (
            <>
              <span className={RESULTADOS[aso.result].classe}>{RESULTADOS[aso.result].texto}</span>
              {aso.next_due && (
                <span className={diasAte(aso.next_due) < 0 ? "text-red-700" : ""}> · próximo exame {dataBR(aso.next_due)}</span>
              )}
            </>
          ) : (
            "Nenhum ASO registrado"
          )}
        </p>
      </Link>
    </div>
  );
}
