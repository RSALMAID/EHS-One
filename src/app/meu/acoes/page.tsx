import { Erro } from "@/components/Erro";
import { encerrada, numero, prazo } from "@/lib/acoes";
import { dataBR } from "@/lib/datas";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { enviarAcao } from "../actions";

type Props = { searchParams: Promise<{ erro?: string; ok?: string }> };

export default async function MinhasAcoes({ searchParams }: Props) {
  const { erro, ok } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const { data } = await supabase
    .from("actions")
    .select("id, number, problem, action, due_date, status, evidence_required")
    .eq("responsible_id", org.workerId!)
    .order("due_date", { ascending: true, nullsFirst: false });
  const acoes = data ?? [];
  const abertas = acoes.filter((a) => a.status === "aberta" || a.status === "em_andamento");
  const outras = acoes.filter((a) => !(a.status === "aberta" || a.status === "em_andamento"));

  return (
    <div>
      <h1 className="text-xl font-bold">Minhas ações</h1>
      <Erro mensagem={erro} />
      {ok && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Enviado para validação.</p>}

      <section className="mt-4 space-y-3">
        {abertas.map((a) => {
          const s = prazo(a.due_date, a.status);
          return (
            <form key={a.id} action={enviarAcao} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm">
              <input type="hidden" name="id" value={a.id} />
              <p className="text-xs text-slate-500">
                {numero(a.number)} · <span className={`inline-block h-2 w-2 rounded-full ${s.cor}`} /> {s.texto}
                {a.due_date ? ` · prazo ${dataBR(a.due_date)}` : ""}
              </p>
              <p className="mt-1 font-medium">{a.action}</p>
              <p className="text-slate-600">{a.problem}</p>
              {a.evidence_required && <p className="mt-1 text-xs text-slate-500">Evidência pedida: {a.evidence_required}</p>}
              <textarea name="nota" rows={2} className="input mt-3" placeholder="O que você fez" />
              <label className="mt-2 block text-xs text-slate-600">
                Foto (opcional)
                <input name="foto" type="file" accept="image/*" capture="environment" className="mt-1 block text-xs" />
              </label>
              <button className="btn mt-3 w-full py-3">Concluí, enviar para validação</button>
            </form>
          );
        })}
        {!abertas.length && (
          <p className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-center text-sm text-slate-500">
            Nenhuma ação pendente com você.
          </p>
        )}
      </section>

      {outras.length > 0 && (
        <>
          <h2 className="mt-6 font-semibold">Enviadas e encerradas</h2>
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
            {outras.map((a) => (
              <li key={a.id} className="px-4 py-3">
                <p className="font-medium">{a.action}</p>
                <p className="text-xs text-slate-500">
                  {numero(a.number)} · {encerrada(a.status) ? prazo(a.due_date, a.status).texto : "Aguardando validação"}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
