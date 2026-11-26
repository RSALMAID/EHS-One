import { rotuloAutorizacao, situacaoAutorizacao } from "@/lib/autorizacoes";
import { dataBR } from "@/lib/datas";
import { meusDados } from "@/lib/meu";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { ROTULO, rotuloTreinamento } from "@/lib/treinamento";

export default async function MeusTreinamentos() {
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ obrigatorios, historico }, { data: auts }, { data: certs }] = await Promise.all([
    meusDados(),
    supabase
      .from("work_authorizations")
      .select("id, kind, scope, valid_until, revoked_on, file_path, file_name")
      .eq("worker_id", org.workerId!)
      .order("issued_on", { ascending: false }),
    supabase
      .from("training_evidences")
      .select("id, file_path, file_name, training_sessions(held_on, trainings(name))")
      .eq("worker_id", org.workerId!)
      .eq("kind", "certificado"),
  ]);
  const autorizacoes = (auts ?? []).filter((a) => !a.revoked_on);
  const certificados = (certs ?? []) as unknown as {
    id: string;
    file_path: string;
    file_name: string;
    training_sessions: { held_on: string; trainings: { name: string } | null } | null;
  }[];
  const caminhos = [...autorizacoes.map((a) => a.file_path), ...certificados.map((c) => c.file_path)].filter(Boolean) as string[];
  const links = new Map<string, string>();
  if (caminhos.length) {
    const { data: assinadas } = await supabase.storage.from("capacitacoes").createSignedUrls(caminhos, 3600);
    for (const s of assinadas ?? []) if (s.path && s.signedUrl) links.set(s.path, s.signedUrl);
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Meus treinamentos</h1>

      <h2 className="mt-4 font-semibold">Exigidos para o meu cargo</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {obrigatorios.map(({ t, s }) => (
          <li key={t.id} className="px-4 py-3">
            <p className="font-medium">{rotuloTreinamento(t)}</p>
            <p className="mt-1">
              <span className={`rounded px-1.5 py-0.5 text-xs ${ROTULO[s.tipo].classe}`}>{ROTULO[s.tipo].texto}</span>
              {s.tipo !== "nunca" && (
                <span className="ml-2 text-slate-600">
                  feito em {dataBR(s.feito)}
                  {s.vence ? `, vale até ${dataBR(s.vence)}` : ""}
                </span>
              )}
            </p>
          </li>
        ))}
        {!obrigatorios.length && <li className="px-4 py-4 text-center text-slate-500">Nenhum exigido.</li>}
      </ul>

      {autorizacoes.length > 0 && (
        <>
          <h2 className="mt-6 font-semibold">Minhas autorizações</h2>
          <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
            {autorizacoes.map((a) => {
              const s = situacaoAutorizacao(a);
              return (
                <li key={a.id} className="px-4 py-3">
                  <p className="font-medium">{rotuloAutorizacao(a.kind)}</p>
                  <p className="mt-1">
                    <span className={`rounded px-1.5 py-0.5 text-xs ${s.classe}`}>{s.texto}</span>
                    <span className="ml-2 text-slate-600">
                      {a.scope ? `${a.scope} · ` : ""}
                      {a.valid_until ? `até ${dataBR(a.valid_until)}` : "sem validade definida"}
                    </span>
                  </p>
                  {a.file_path && links.get(a.file_path) && (
                    <a href={links.get(a.file_path)} target="_blank" rel="noreferrer" className="mt-1 inline-block text-emerald-700 underline">
                      Ver documento
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {certificados.length > 0 && (
        <>
          <h2 className="mt-6 font-semibold">Meus certificados</h2>
          <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
            {certificados.map((c) => (
              <li key={c.id} className="px-4 py-3">
                <p className="font-medium">{c.training_sessions?.trainings?.name ?? "Treinamento"}</p>
                <p className="text-slate-600">
                  {c.training_sessions ? dataBR(c.training_sessions.held_on) : ""}
                  {links.get(c.file_path) && (
                    <a href={links.get(c.file_path)} target="_blank" rel="noreferrer" className="ml-2 text-emerald-700 underline">
                      Abrir
                    </a>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mt-6 font-semibold">Histórico</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {historico.map((h, i) => (
          <li key={i} className="px-4 py-3">
            <p className="font-medium">{h.nome}</p>
            <p className="text-slate-600">
              {dataBR(h.held_on)}
              {h.instructor ? ` · ${h.instructor}` : ""} · {h.approved ? "aprovado" : "não aprovado / faltou"}
            </p>
          </li>
        ))}
        {!historico.length && <li className="px-4 py-4 text-center text-slate-500">Nenhuma turma ainda.</li>}
      </ul>
    </div>
  );
}
