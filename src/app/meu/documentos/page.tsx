import { dataBR } from "@/lib/datas";
import { CATEGORIAS_DOC } from "@/lib/dds";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

/** Documentos que a equipe liberou para os trabalhadores (o banco só devolve esses). */
export default async function MeusDocumentosPage() {
  const org = await requireOrg();
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("id, title, category, version, valid_until, file_path, file_name")
    .eq("organization_id", org.id)
    .eq("visible_to_workers", true)
    .order("title");
  const docs = data ?? [];
  const caminhos = docs.map((d) => d.file_path).filter(Boolean) as string[];
  const links = new Map<string, string>();
  if (caminhos.length) {
    const { data: assinadas } = await supabase.storage.from("documentos").createSignedUrls(caminhos, 3600);
    for (const s of assinadas ?? []) if (s.path && s.signedUrl) links.set(s.path, s.signedUrl);
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Documentos</h1>
      <p className="mt-1 text-sm text-slate-600">Procedimentos e programas de segurança da empresa.</p>
      <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {docs.map((d) => {
          const url = d.file_path ? links.get(d.file_path) : null;
          return (
            <li key={d.id} className="px-4 py-3">
              {url ? (
                <a href={url} target="_blank" rel="noreferrer" className="font-medium text-emerald-800 underline">{d.title}</a>
              ) : (
                <span className="font-medium">{d.title}</span>
              )}
              <span className="block text-xs text-slate-500">
                {CATEGORIAS_DOC[d.category]}
                {d.version ? ` · rev. ${d.version}` : ""}
                {d.valid_until ? ` · válido até ${dataBR(d.valid_until)}` : ""}
              </span>
            </li>
          );
        })}
        {!docs.length && <li className="px-4 py-4 text-center text-slate-500">Nenhum documento disponível.</li>}
      </ul>
    </div>
  );
}
