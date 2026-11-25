import { adicionarParticipante, assinarTarefa, removerParticipante } from "@/app/app/apr/actions";
import { dataHora, PAPEIS } from "@/lib/apr";

export type Assinante = { id: string; worker_id: string; role: string; signed_at: string | null };
type Pessoa = { id: string; full_name: string };

/** Lista de quem participa da APR/PT, com assinatura pelo próprio celular. */
export function Participantes({
  alvo,
  assinaturas,
  pessoas,
  meuWorkerId,
  podeEditar,
  podeAssinar,
  voltar,
  papeis,
}: {
  alvo: { apr?: string; pt?: string };
  assinaturas: Assinante[];
  pessoas: Pessoa[];
  meuWorkerId: string | null;
  podeEditar: boolean;
  podeAssinar: boolean;
  voltar: string;
  papeis: string[];
}) {
  const nome = (id: string) => pessoas.find((p) => p.id === id)?.full_name ?? "—";
  return (
    <section className="mt-6">
      <h2 className="font-semibold">Participantes e assinaturas</h2>
      <p className="text-xs text-slate-500">Cada pessoa assina no próprio celular, logada no Meu EHS.</p>
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {assinaturas.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
            <span>
              {nome(s.worker_id)} · <span className="text-slate-500">{PAPEIS[s.role] ?? s.role}</span>
            </span>
            <span className="flex items-center gap-3">
              {s.signed_at ? (
                <span className="text-emerald-700">✓ assinou {dataHora(s.signed_at)}</span>
              ) : s.worker_id === meuWorkerId && podeAssinar ? (
                <form action={assinarTarefa}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="voltar" value={voltar} />
                  <button className="btn">Li e assino</button>
                </form>
              ) : (
                <span className="text-amber-700">aguardando assinatura</span>
              )}
              {podeEditar && !s.signed_at && (
                <form action={removerParticipante}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="voltar" value={voltar} />
                  <button className="text-xs text-red-600 hover:underline">Retirar</button>
                </form>
              )}
            </span>
          </li>
        ))}
        {!assinaturas.length && <li className="px-4 py-4 text-center text-slate-500">Ninguém incluído ainda.</li>}
      </ul>
      {podeEditar && (
        <form action={adicionarParticipante} className="mt-2 flex flex-wrap items-end gap-2 text-sm">
          {alvo.apr && <input type="hidden" name="apr" value={alvo.apr} />}
          {alvo.pt && <input type="hidden" name="pt" value={alvo.pt} />}
          <input type="hidden" name="voltar" value={voltar} />
          <select name="trabalhador" required className="input min-w-0 flex-1" defaultValue="">
            <option value="">Incluir pessoa…</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
          {papeis.length > 1 && (
            <select name="papel" className="input w-auto">
              {papeis.map((p) => (
                <option key={p} value={p}>{PAPEIS[p]}</option>
              ))}
            </select>
          )}
          <button className="btn-ghost">Incluir</button>
        </form>
      )}
    </section>
  );
}
