import Link from "next/link";
import { notFound } from "next/navigation";
import { Erro } from "@/components/Erro";
import { CamposDocumento } from "@/components/FormDocumento";
import { situacaoValidade } from "@/lib/dds";
import { requireOrg } from "@/lib/org";
import { opcoesSetor } from "@/lib/setores";
import { createClient } from "@/lib/supabase/server";
import { excluirDocumento, salvarDocumento } from "../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ok?: string }> };

export default async function DocumentoPage({ params, searchParams }: Props) {
  const [{ id }, { erro, ok }] = await Promise.all([params, searchParams]);
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: doc }, setores] = await Promise.all([
    supabase.from("documents").select("*").eq("id", id).maybeSingle(),
    opcoesSetor(org.id),
  ]);
  if (!doc) notFound();
  const { data: link } = doc.file_path
    ? await supabase.storage.from("documentos").createSignedUrl(doc.file_path, 3600)
    : { data: null };
  const s = situacaoValidade(doc.valid_until);

  return (
    <div>
      <Link href="/app/documentos" className="text-sm text-emerald-700 underline">← Documentos</Link>
      <h1 className="mt-3 text-xl font-bold">{doc.title}</h1>
      <p className="mt-1 flex flex-wrap items-center gap-3 text-sm">
        <span className={`rounded px-2 py-0.5 text-xs ${s.cor}`}>{s.texto}</span>
        {link?.signedUrl && (
          <a href={link.signedUrl} target="_blank" rel="noreferrer" className="text-emerald-700 underline">
            Abrir {doc.file_name}
          </a>
        )}
      </p>
      <Erro mensagem={erro} />
      {ok && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Alterações salvas.</p>}

      <form action={salvarDocumento} className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
        <input type="hidden" name="id" value={doc.id} />
        <CamposDocumento doc={doc} setores={setores} />
        <div className="sm:col-span-2">
          <button className="btn">Salvar</button>
        </div>
      </form>
      <form action={excluirDocumento} className="mt-6">
        <input type="hidden" name="id" value={doc.id} />
        <button className="text-xs text-red-600 hover:underline">Excluir documento e arquivo</button>
      </form>
    </div>
  );
}
