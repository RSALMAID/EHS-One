import { VazioLista } from "@/components/EstadoVazio";
import { FolderOpen } from "lucide-react";
import Link from "next/link";
import { Erro } from "@/components/Erro";
import { CamposDocumento } from "@/components/FormDocumento";
import { dataBR } from "@/lib/datas";
import { CATEGORIAS_DOC, situacaoValidade } from "@/lib/dds";
import { requireOrg } from "@/lib/org";
import { opcoesSetor } from "@/lib/setores";
import { createClient } from "@/lib/supabase/server";
import { criarDocumento } from "./actions";

type Props = { searchParams: Promise<{ erro?: string; ok?: string }> };

export default async function DocumentosPage({ searchParams }: Props) {
  const { erro, ok } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data }, setores] = await Promise.all([
    supabase
      .from("documents")
      .select("id, title, category, version, valid_until, file_name, visible_to_workers, sectors(name)")
      .eq("organization_id", org.id)
      .order("title"),
    opcoesSetor(org.id),
  ]);
  const docs = ((data ?? []) as unknown as {
    id: string;
    title: string;
    category: string;
    version: string | null;
    valid_until: string | null;
    file_name: string | null;
    visible_to_workers: boolean;
    sectors: { name: string } | null;
  }[]).sort((a, b) => situacaoValidade(a.valid_until).ordem - situacaoValidade(b.valid_until).ordem);
  const alerta = docs.filter((d) => situacaoValidade(d.valid_until).ordem < 2).length;

  return (
    <div>
      <h1 className="titulo">Documentos</h1>
      <p className="mt-1 text-sm text-slate-600">
        Programas, laudos, procedimentos, licenças e certificados num lugar só, com versão e validade. Os vencidos e os
        que vencem em 30 dias aparecem primeiro.
      </p>
      <Erro mensagem={erro} />
      {ok && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Documento salvo.</p>}
      {alerta > 0 && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {alerta} documento(s) vencido(s) ou vencendo em até 30 dias.
        </p>
      )}

      <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
        {docs.map((d) => {
          const s = situacaoValidade(d.valid_until);
          return (
            <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
              <span>
                <Link href={`/app/documentos/${d.id}`} className="font-medium text-emerald-800 underline">{d.title}</Link>
                <span className="text-slate-500">
                  {" "}· {CATEGORIAS_DOC[d.category]}
                  {d.version ? ` · rev. ${d.version}` : ""}
                  {d.sectors ? ` · ${d.sectors.name}` : ""}
                  {d.file_name ? "" : " · sem arquivo"}
                  {d.visible_to_workers ? " · visível no Meu EHS" : ""}
                </span>
              </span>
              <span className={`rounded px-2 py-0.5 text-xs ${s.cor}`}>
                {d.valid_until ? `${dataBR(d.valid_until)} · ` : ""}
                {s.texto}
              </span>
            </li>
          );
        })}
        {!docs.length && (
          <VazioLista
            icone={FolderOpen}
            titulo="Nenhum documento ainda"
            texto="Guarde PGR, PCMSO, laudos e procedimentos com versão e validade. O sistema avisa antes de vencer."
            acao={{ texto: "Incluir documento", href: "/app/documentos#novo" }}
          />
        )}
      </ul>

      <details id="novo" className="mt-6 scroll-mt-20" open={!docs.length}>
        <summary className="cursor-pointer text-sm font-medium text-emerald-800">+ Novo documento</summary>
        <form action={criarDocumento} className="mt-2 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-2">
          <CamposDocumento setores={setores} />
          <div className="sm:col-span-2">
            <button className="btn">Salvar documento</button>
          </div>
        </form>
      </details>
    </div>
  );
}
