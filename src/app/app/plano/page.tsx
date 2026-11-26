import { Erro } from "@/components/Erro";
import { dataBR } from "@/lib/datas";
import { liberado, modulosLiberados } from "@/lib/modulos";
import { requireOrg, testeVencido, trialDaysLeft } from "@/lib/org";
import { catalogo, STATUS_PEDIDO } from "@/lib/planos";
import { createClient } from "@/lib/supabase/server";
import { pedirPlano } from "./actions";

type Props = { searchParams: Promise<{ erro?: string; ok?: string; modulo?: string }> };

export default async function PlanoPage({ searchParams }: Props) {
  const { erro, ok, modulo } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ planos, modulos, inclui }, liberados, { data: pedidos }] = await Promise.all([
    catalogo(),
    modulosLiberados(org.id),
    supabase
      .from("plan_requests")
      .select("id, requested_plan, note, status, answer, created_at")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false }),
  ]);
  const listados = planos.filter((p) => p.listed);
  const atual = planos.find((p) => p.code === org.plan);
  const dias = trialDaysLeft(org.trialEndsAt);
  const vencido = testeVencido(org);
  const pode = ["proprietario", "admin_ehs"].includes(org.role);
  const pendente = (pedidos ?? []).some((p) => p.status === "pendente");
  const bloqueado = modulos.find((m) => m.code === modulo);

  return (
    <div>
      <h1 className="titulo">Plano e módulos</h1>
      <p className="subtitulo">
        Seu plano define quais módulos a empresa usa. Os dados de módulos fora do plano ficam guardados e voltam a aparecer
        quando o módulo é liberado.
      </p>
      <Erro mensagem={erro} />
      {ok && (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Pedido enviado. A equipe EHS One vai entrar em contato para combinar a mudança.
        </p>
      )}
      {bloqueado && !liberado(liberados, bloqueado.code) && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          O módulo <strong>{bloqueado.name}</strong> não está incluído no seu plano. Veja abaixo quais planos o incluem.
        </p>
      )}

      <div className="card mt-6 text-sm">
        <p className="text-slate-500">Plano atual</p>
        <p className="mt-1 text-xl font-semibold text-slate-900">{atual?.name ?? org.plan}</p>
        {org.plan === "teste" && (
          <p className={`mt-1 ${vencido ? "text-red-700" : "text-slate-600"}`}>
            {vencido
              ? "O teste grátis terminou. O sistema fica bloqueado até a escolha de um plano; todos os dados estão guardados."
              : `Teste grátis até ${dataBR(org.trialEndsAt.slice(0, 10))} (${dias} ${dias === 1 ? "dia" : "dias"}). Depois, sem plano escolhido, o sistema fica bloqueado até a escolha (os dados ficam guardados).`}
          </p>
        )}
      </div>

      <h2 className="mt-8 font-semibold text-slate-900">Compare os planos</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse rounded-xl bg-white text-sm shadow-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="px-3 py-2 text-xs text-slate-500">Módulo</th>
              {listados.map((p) => (
                <th key={p.code} className={`px-3 py-2 text-center ${p.code === org.plan ? "bg-emerald-50 text-emerald-800" : ""}`}>
                  {p.name}
                  <span className="block text-xs font-normal text-slate-500">{p.price_label ?? "sob consulta"}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modulos.map((m) => (
              <tr key={m.code} className={`border-b border-slate-100 ${m.code === modulo ? "bg-amber-50" : ""}`}>
                <td className="px-3 py-1.5">
                  {m.name}
                  {!vencido && liberado(liberados, m.code) && <span className="ml-1 text-xs text-emerald-700">· liberado</span>}
                </td>
                {listados.map((p) => (
                  <td key={p.code} className={`px-3 py-1.5 text-center ${p.code === org.plan ? "bg-emerald-50" : ""}`}>
                    {inclui(p.code, m.code) ? <span className="text-emerald-700">✓</span> : <span className="text-slate-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        {listados.map((p) => (
          <li key={p.code}>
            <strong className="text-slate-800">{p.name}:</strong> {p.description}
          </li>
        ))}
      </ul>

      <h2 className="mt-8 font-semibold text-slate-900">Mudar de plano</h2>
      {pode ? (
        <form action={pedirPlano} className="card mt-2 grid gap-3 text-sm sm:grid-cols-3 sm:items-end">
          <label>
            Plano desejado
            <select name="plano" required className="input mt-1" defaultValue="">
              <option value="" disabled>Escolha…</option>
              {listados
                .filter((p) => p.code !== org.plan)
                .map((p) => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            Observação
            <input name="obs" className="input mt-1" placeholder="Ex.: número de trabalhadores, melhor horário para contato" />
          </label>
          <div className="sm:col-span-3">
            <button className="btn" disabled={pendente}>Pedir mudança de plano</button>
            {pendente && <span className="ml-3 text-xs text-slate-500">Já existe um pedido aguardando.</span>}
          </div>
        </form>
      ) : (
        <p className="mt-2 text-sm text-slate-600">Peça ao proprietário da conta para solicitar a mudança de plano.</p>
      )}

      {!!pedidos?.length && (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
          {pedidos.map((p) => (
            <li key={p.id} className="px-4 py-3">
              <span className="font-medium">{planos.find((x) => x.code === p.requested_plan)?.name ?? p.requested_plan}</span>
              <span className="text-slate-500"> · pedido em {dataBR(p.created_at.slice(0, 10))} · {STATUS_PEDIDO[p.status]}</span>
              {p.answer && <p className="mt-1 text-slate-600">Resposta: {p.answer}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
