import { Erro } from "@/components/Erro";
import { dataBR } from "@/lib/datas";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { excluirComunicado, publicarComunicado } from "../dds/actions";

type Props = { searchParams: Promise<{ erro?: string }> };

export default async function ComunicadosPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data }, { count: membros }] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, body, expires_on, created_at, announcement_reads(user_id)")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("memberships").select("user_id", { count: "exact", head: true }).eq("organization_id", org.id),
  ]);
  const lista = (data ?? []) as unknown as {
    id: string;
    title: string;
    body: string;
    expires_on: string | null;
    created_at: string;
    announcement_reads: { user_id: string }[];
  }[];

  return (
    <div>
      <h1 className="text-2xl font-bold">Comunicados</h1>
      <p className="mt-1 text-sm text-slate-600">
        Avisos que aparecem no Início do Meu EHS de todos, com o botão “Li e entendi”. Aqui você vê quantos já leram.
      </p>
      <Erro mensagem={erro} />

      <form action={publicarComunicado} className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <label>
          Título
          <input name="titulo" required className="input mt-1" placeholder="Ex.: simulado de abandono na sexta" />
        </label>
        <label>
          Texto
          <textarea name="texto" required rows={3} className="input mt-1" />
        </label>
        <label className="sm:w-60">
          Mostrar até (opcional)
          <input name="ate" type="date" className="input mt-1" />
        </label>
        <div>
          <button className="btn">Publicar</button>
        </div>
      </form>

      <ul className="mt-6 space-y-3">
        {lista.map((c) => (
          <li key={c.id} className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold">{c.title}</p>
              <form action={excluirComunicado}>
                <input type="hidden" name="id" value={c.id} />
                <button className="text-xs text-red-600 hover:underline">Excluir</button>
              </form>
            </div>
            <p className="mt-1 whitespace-pre-line">{c.body}</p>
            <p className="mt-2 text-xs text-slate-500">
              {dataBR(c.created_at)}
              {c.expires_on ? ` · até ${dataBR(c.expires_on)}` : ""} · lido por {c.announcement_reads.length} de{" "}
              {membros ?? "?"} pessoa(s)
            </p>
          </li>
        ))}
        {!lista.length && <li className="text-sm text-slate-500">Nenhum comunicado ainda.</li>}
      </ul>
    </div>
  );
}
