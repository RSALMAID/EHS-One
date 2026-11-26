import Link from "next/link";
import { Erro } from "@/components/Erro";
import { rotuloAutorizacao, situacaoAutorizacao, TIPOS_AUTORIZACAO } from "@/lib/autorizacoes";
import { dataBR, hoje } from "@/lib/datas";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { ROTULO, rotuloTreinamento, situacao, type Participacao, type Treinamento } from "@/lib/treinamento";
import { criarAutorizacao, excluirAutorizacao, renovarAutorizacao, revogarAutorizacao } from "./actions";

type Props = { searchParams: Promise<{ erro?: string; ok?: string; ver?: string }> };

type Autorizacao = {
  id: string;
  worker_id: string;
  kind: string;
  scope: string | null;
  training_id: string | null;
  issued_on: string;
  valid_until: string | null;
  issued_by: string | null;
  revoked_on: string | null;
  revoked_reason: string | null;
  file_path: string | null;
  file_name: string | null;
  workers: { full_name: string } | null;
};

const FILTROS: Record<string, string> = {
  atencao: "Vencidas e vencendo",
  vigente: "Vigentes",
  revogada: "Revogadas",
  todas: "Todas",
};

export default async function AutorizacoesPage({ searchParams }: Props) {
  const { erro, ok, ver = "todas" } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data }, { data: trabalhadores }, { data: treinos }, { data: presencas }] = await Promise.all([
    supabase
      .from("work_authorizations")
      .select("id, worker_id, kind, scope, training_id, issued_on, valid_until, issued_by, revoked_on, revoked_reason, file_path, file_name, workers(full_name)")
      .eq("organization_id", org.id),
    supabase.from("workers").select("id, full_name").eq("organization_id", org.id).eq("active", true).order("full_name"),
    supabase
      .from("trainings")
      .select("id, name, norm_reference, workload_hours, validity_months, active")
      .eq("organization_id", org.id)
      .order("name"),
    supabase
      .from("training_attendances")
      .select("worker_id, training_sessions(training_id, held_on)")
      .eq("organization_id", org.id)
      .eq("approved", true),
  ]);
  const todas = ((data ?? []) as unknown as Autorizacao[]).sort(
    (a, b) => (a.workers?.full_name ?? "").localeCompare(b.workers?.full_name ?? "") || a.kind.localeCompare(b.kind),
  );
  const treinamentos = (treinos ?? []) as Treinamento[];
  const porId = new Map(treinamentos.map((t) => [t.id, t]));
  const participacoes: Participacao[] = (presencas ?? []).flatMap((p) => {
    const s = p.training_sessions as unknown as { training_id: string; held_on: string } | null;
    return s ? [{ worker_id: p.worker_id, training_id: s.training_id, held_on: s.held_on }] : [];
  });
  const lista = todas.filter((a) => {
    const s = situacaoAutorizacao(a).tipo;
    if (ver === "atencao") return s === "vencida" || s === "vence";
    if (ver === "vigente") return s === "vigente" || s === "vence";
    if (ver === "revogada") return s === "revogada";
    return true;
  });
  const urls = new Map<string, string>();
  const caminhos = lista.map((a) => a.file_path).filter(Boolean) as string[];
  if (caminhos.length) {
    const { data: assinadas } = await supabase.storage.from("capacitacoes").createSignedUrls(caminhos, 3600);
    for (const s of assinadas ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  const atencao = todas.filter((a) => ["vencida", "vence"].includes(situacaoAutorizacao(a).tipo)).length;
  const h = hoje();

  return (
    <div>
      <h1 className="titulo">Autorizações</h1>
      <p className="mt-1 text-sm text-slate-600">
        Quem está autorizado a fazer cada serviço de risco (NR-10, NR-33, NR-35, operadores…), até quando, por quem, e o
        documento assinado. Ligue a autorização ao treinamento exigido para ver se a capacitação está em dia. As evidências
        de cada turma (lista assinada, certificados) ficam na página da turma, em{" "}
        <Link href="/app/treinamentos" className="underline">Treinamentos</Link>.
      </p>
      <Erro mensagem={erro} />
      {ok && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Autorização salva.</p>}
      {atencao > 0 && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {atencao} autorização(ões) vencida(s) ou vencendo em 30 dias.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {Object.entries(FILTROS).map(([k, l]) => (
          <Link
            key={k}
            href={k === "todas" ? "/app/autorizacoes" : `/app/autorizacoes?ver=${k}`}
            className={`rounded-full border px-3 py-1 ${ver === k ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white"}`}
          >
            {l}
          </Link>
        ))}
      </div>

      <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
        {lista.map((a) => {
          const s = situacaoAutorizacao(a);
          const t = a.training_id ? porId.get(a.training_id) : undefined;
          const st = t ? situacao(t, participacoes, a.worker_id) : null;
          return (
            <li key={a.id} className={`px-4 py-3 ${s.tipo === "revogada" ? "text-slate-400" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{a.workers?.full_name ?? "—"}</span>
                <span>· {rotuloAutorizacao(a.kind)}</span>
                <span className={`rounded px-2 py-0.5 text-xs ${s.classe}`}>{s.texto}</span>
              </div>
              <div className="mt-1 text-slate-500">
                {a.scope ? `${a.scope} · ` : ""}emitida em {dataBR(a.issued_on)}
                {a.valid_until ? ` · válida até ${dataBR(a.valid_until)}` : " · sem validade definida"}
                {a.issued_by ? ` · por ${a.issued_by}` : ""}
                {a.revoked_on ? ` · revogada em ${dataBR(a.revoked_on)}: ${a.revoked_reason ?? ""}` : ""}
              </div>
              {t && st && (
                <div className="mt-1 text-xs">
                  Treinamento {rotuloTreinamento(t)}:{" "}
                  <span className={`rounded px-1.5 py-0.5 ${ROTULO[st.tipo].classe}`}>{ROTULO[st.tipo].texto}</span>
                  {st.tipo !== "nunca" && st.vence && <span className="ml-1 text-slate-500">vale até {dataBR(st.vence)}</span>}
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                {a.file_path && urls.get(a.file_path) && (
                  <a href={urls.get(a.file_path)} target="_blank" rel="noreferrer" className="text-emerald-700 underline">
                    📎 {a.file_name}
                  </a>
                )}
                {!a.file_path && s.tipo !== "revogada" && <span className="text-amber-700">sem documento assinado</span>}
                {s.tipo !== "revogada" && (
                  <>
                    <details>
                      <summary className="cursor-pointer text-emerald-700 underline">renovar</summary>
                      <form action={renovarAutorizacao} className="mt-2 flex flex-wrap items-end gap-2">
                        <input type="hidden" name="id" value={a.id} />
                        <label>
                          Nova validade
                          <input name="validade" type="date" min={h} className="input mt-1" />
                        </label>
                        <label>
                          Documento novo
                          <input name="arquivo" type="file" className="mt-1 block text-xs" />
                        </label>
                        <button className="btn">Renovar</button>
                      </form>
                    </details>
                    <details>
                      <summary className="cursor-pointer text-red-700 underline">revogar</summary>
                      <form action={revogarAutorizacao} className="mt-2 flex flex-wrap items-end gap-2">
                        <input type="hidden" name="id" value={a.id} />
                        <label>
                          Motivo
                          <input name="motivo" required className="input mt-1" placeholder="Ex.: ASO inapto, mudou de função" />
                        </label>
                        <button className="btn">Revogar</button>
                      </form>
                    </details>
                  </>
                )}
                <form action={excluirAutorizacao}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="text-red-700 underline">excluir</button>
                </form>
              </div>
            </li>
          );
        })}
        {!lista.length && <li className="px-4 py-6 text-center text-slate-500">Nenhuma autorização aqui.</li>}
      </ul>

      <details className="mt-6" open={!todas.length}>
        <summary className="cursor-pointer text-sm font-medium text-emerald-800">+ Nova autorização</summary>
        <form action={criarAutorizacao} className="mt-2 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-2">
          <label>
            Pessoa
            <select name="trabalhador" required className="input mt-1" defaultValue="">
              <option value="" disabled>Escolha…</option>
              {(trabalhadores ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </label>
          <label>
            Tipo
            <select name="tipo" required className="input mt-1" defaultValue="">
              <option value="" disabled>Escolha…</option>
              {Object.keys(TIPOS_AUTORIZACAO).map((k) => (
                <option key={k} value={k}>{rotuloAutorizacao(k)}</option>
              ))}
            </select>
          </label>
          <label>
            Se for &quot;outra&quot;, qual
            <input name="outra" className="input mt-1" />
          </label>
          <label>
            Escopo / limites
            <input name="escopo" className="input mt-1" placeholder="Ex.: subestação 13,8 kV; ponte rolante 10 t" />
          </label>
          <label>
            Treinamento exigido
            <select name="treinamento" className="input mt-1" defaultValue="">
              <option value="">—</option>
              {treinamentos.map((t) => (
                <option key={t.id} value={t.id}>{rotuloTreinamento(t)}</option>
              ))}
            </select>
          </label>
          <label>
            Autorizado por
            <input name="emitente" className="input mt-1" placeholder="Nome e cargo de quem autoriza" />
          </label>
          <label>
            Emissão
            <input name="emissao" type="date" defaultValue={h} className="input mt-1" />
          </label>
          <label>
            Válida até
            <input name="validade" type="date" className="input mt-1" />
          </label>
          <label className="sm:col-span-2">
            Documento assinado (PDF ou foto)
            <input name="arquivo" type="file" accept="application/pdf,image/*" className="mt-1 block text-xs" />
          </label>
          <label className="sm:col-span-2">
            Observações
            <input name="obs" className="input mt-1" />
          </label>
          <div className="sm:col-span-2">
            <button className="btn">Salvar autorização</button>
            <span className="ml-3 text-xs text-slate-500">
              Antes de autorizar, confira o treinamento em dia e a aptidão no ASO para a atividade.
            </span>
          </div>
        </form>
      </details>
    </div>
  );
}
