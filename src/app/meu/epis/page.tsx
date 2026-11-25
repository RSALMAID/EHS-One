import { Erro } from "@/components/Erro";
import { Assinatura } from "@/lib/assinatura";
import { dataBR } from "@/lib/datas";
import { meusDados } from "@/lib/meu";
import { confirmarEpi } from "../actions";

type Props = { searchParams: Promise<{ erro?: string; ok?: string }> };

export default async function MeusEpis({ searchParams }: Props) {
  const { erro, ok } = await searchParams;
  const { entregas } = await meusDados();
  const pendentes = entregas.filter((e) => !e.confirmed_at && !e.signature_name);
  const feitas = entregas.filter((e) => e.confirmed_at || e.signature_name);

  return (
    <div>
      <h1 className="text-xl font-bold">Meus EPIs</h1>
      <Erro mensagem={erro} />
      {ok && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Recebimento confirmado.</p>}

      {pendentes.length > 0 && (
        <section className="mt-4 space-y-3">
          <h2 className="font-semibold text-amber-800">Para confirmar</h2>
          {pendentes.map((e) => (
            <form key={e.id} action={confirmarEpi} className="rounded-lg border border-amber-400 bg-amber-50 p-4 text-sm">
              <input type="hidden" name="id" value={e.id} />
              <p className="font-medium">
                {e.ppe_items?.name} · {e.quantity} un.
              </p>
              <p className="text-slate-600">Entregue em {dataBR(e.delivered_on)} · CA {e.ca_number ?? "—"}</p>
              <label className="mt-3 flex items-start gap-2">
                <input type="checkbox" name="declaro" required className="mt-1 h-5 w-5" />
                Declaro que recebi este EPI gratuitamente, fui orientado sobre o uso correto, guarda e conservação, e
                me comprometo a usá-lo e a comunicar qualquer dano (NR-6).
              </label>
              <button className="btn mt-3 w-full py-3">Confirmar recebimento</button>
            </form>
          ))}
        </section>
      )}

      <h2 className="mt-6 font-semibold">Histórico</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {feitas.map((e) => (
          <li key={e.id} className="px-4 py-3">
            <p className="font-medium">{e.ppe_items?.name} · {e.quantity} un.</p>
            <p className="text-slate-600">
              {dataBR(e.delivered_on)} · CA {e.ca_number ?? "—"} · <Assinatura e={e} />
            </p>
          </li>
        ))}
        {!feitas.length && <li className="px-4 py-4 text-center text-slate-500">Nenhuma entrega registrada.</li>}
      </ul>
    </div>
  );
}
