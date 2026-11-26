import { Erro } from "@/components/Erro";
import { FormRelato } from "@/components/FormRelato";
import { numeroEvento, STATUS_EVENTO, TIPOS_EVENTO, TIPOS_RELATO } from "@/lib/eventos";
import { requireOrg } from "@/lib/org";
import { opcoesSetor } from "@/lib/setores";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ erro?: string; ok?: string }> };

export default async function RelatarPage({ searchParams }: Props) {
  const { erro, ok } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [setores, { data: meus }] = await Promise.all([
    opcoesSetor(org.id),
    supabase
      .from("events")
      .select("id, number, kind, status, occurred_at")
      .eq("organization_id", org.id)
      .eq("reported_by", user!.id)
      .order("occurred_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold">Relatar</h1>
      <p className="mt-1 text-sm text-slate-600">
        Viu algo errado ou quase aconteceu um acidente? Conte aqui. Isso ajuda a evitar que alguém se machuque.
      </p>
      <Erro mensagem={erro} />
      {ok && (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Relato enviado. Obrigado! A equipe de segurança vai analisar.
        </p>
      )}
      <div className="mt-4">
        <FormRelato tipos={TIPOS_RELATO} setores={setores} voltar="/meu/relatar" celular />
      </div>

      <h2 className="mt-6 font-semibold">Meus relatos</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
        {(meus ?? []).map((e) => (
          <li key={e.id} className="px-4 py-3">
            <p className="font-medium">
              {numeroEvento(e.number)} · {TIPOS_EVENTO[e.kind].nome}
            </p>
            <p className="text-slate-600">
              {new Date(e.occurred_at).toLocaleDateString("pt-BR")} · {STATUS_EVENTO[e.status]}
            </p>
          </li>
        ))}
        {!meus?.length && <li className="px-4 py-4 text-center text-slate-500">Nenhum relato ainda.</li>}
      </ul>
    </div>
  );
}
