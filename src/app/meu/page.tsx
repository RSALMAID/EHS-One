import Link from "next/link";
import { dataBR, diasAte } from "@/lib/datas";
import { meusDados } from "@/lib/meu";
import { RESULTADOS } from "@/lib/saude";
import { createClient } from "@/lib/supabase/server";
import { lerComunicado } from "./actions";
import { hoje } from "@/lib/datas";

export default async function MeuInicio() {
  const { trabalhador, entregas, obrigatorios, asos } = await meusDados();
  const aConfirmar = entregas.filter((e) => !e.confirmed_at && !e.signature_name).length;
  const treinosPend = obrigatorios.filter((o) => o.s.tipo !== "ok").length;
  const aso = asos[0];
  const supabase = await createClient();
  const { count: assinar } = await supabase
    .from("task_signatures")
    .select("id", { count: "exact", head: true })
    .eq("worker_id", trabalhador.id)
    .is("signed_at", null);
  const [{ data: comunicados }, { data: lidos }, { count: ddsAbertos }] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, body, expires_on")
      .or(`expires_on.is.null,expires_on.gte.${hoje()}`)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("announcement_reads").select("announcement_id"),
    supabase.from("dds_talks").select("id", { count: "exact", head: true }).eq("status", "aberto"),
  ]);
  const jaLidos = new Set((lidos ?? []).map((l) => l.announcement_id));
  const novos = (comunicados ?? []).filter((c) => !jaLidos.has(c.id));

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Olá, {trabalhador.full_name.split(" ")[0]}</h1>
      <p className="text-sm text-slate-600">
        {trabalhador.job_roles?.name ?? "Sem cargo"}
        {trabalhador.sectors ? ` · ${trabalhador.sectors.name}` : ""}
      </p>

      {novos.map((c) => (
        <div key={c.id} className="rounded-lg border border-sky-300 bg-sky-50 p-4">
          <p className="text-xs font-medium uppercase text-sky-800">Comunicado</p>
          <p className="font-semibold">{c.title}</p>
          <p className="mt-1 whitespace-pre-line text-sm">{c.body}</p>
          <form action={lerComunicado} className="mt-2">
            <input type="hidden" name="id" value={c.id} />
            <button className="btn-ghost">Li e entendi</button>
          </form>
        </div>
      ))}

      <Link href="/meu/relatar" className="block rounded-lg bg-emerald-700 p-4 text-white">
        <p className="font-semibold">Relatar desvio ou quase acidente</p>
        <p className="text-sm text-emerald-50">Leva menos de um minuto, com foto</p>
      </Link>

      <Link href="/meu/apr" className={`block rounded-lg border p-4 ${assinar ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"}`}>
        <p className="font-semibold">APR e PT</p>
        <p className="text-sm">{assinar ? `${assinar} assinatura(s) esperando por você` : "Análise de risco e permissão de trabalho"}</p>
      </Link>

      <Link href="/meu/dds" className={`block rounded-lg border p-4 ${ddsAbertos ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"}`}>
        <p className="font-semibold">DDS</p>
        <p className="text-sm">{ddsAbertos ? "Confirme a presença no DDS de hoje" : "Diálogos de segurança de que você participou"}</p>
      </Link>

      <Link href="/meu/documentos" className="block rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <p className="font-semibold">Documentos</p>
        <p className="text-sm">Procedimentos e programas de segurança</p>
      </Link>

      <Link href="/meu/inspecoes" className="block rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <p className="font-semibold">Inspeções</p>
        <p className="text-sm">Fazer um checklist no local, com foto</p>
      </Link>

      <Link href="/meu/acoes" className="block rounded-xl border border-slate-200 bg-white shadow-sm p-4">
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

      <Link href="/meu/saude" className="block rounded-xl border border-slate-200 bg-white shadow-sm p-4">
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
