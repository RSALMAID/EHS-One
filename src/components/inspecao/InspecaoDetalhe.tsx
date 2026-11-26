import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { Erro } from "@/components/Erro";
import { dataBR } from "@/lib/datas";
import { atendimento, numeroInspecao, RESPOSTAS } from "@/lib/inspecao";
import { QuadroAssinatura } from "@/components/QuadroAssinatura";
import { dataHora } from "@/lib/apr";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { assinarInspecao, excluirInspecao, reabrirInspecao, salvarRespostas } from "@/app/app/inspecoes/actions";
import { podeAprovar } from "@/lib/apr";


type Inspecao = {
  id: string;
  number: number;
  location: string | null;
  created_by: string | null;
  inspected_on: string;
  inspector: string | null;
  status: string;
  notes: string | null;
  equipment_tag: string | null;
  inspected_at: string | null;
  inspector_document: string | null;
  company_name: string | null;
  checklist_templates: { name: string; equipment: string | null; signature_roles: string[] | null } | null;
  sectors: { name: string } | null;
};
type Assinatura = {
  id: string;
  role: string;
  signer_name: string;
  signer_document: string;
  image: string;
  signed_at: string;
  ip: string | null;
  device: string | null;
  hash: string;
};
type Resposta = {
  id: string;
  position: number;
  question: string;
  answer: string | null;
  comment: string | null;
  photo_path: string | null;
  photo_name: string | null;
  action_id: string | null;
  actions: { number: number; status: string; plan_id: string } | null;
};

/** Tela da inspeção, igual na Gestão (base "/app") e no Meu EHS (base "/meu"). */
export async function InspecaoDetalhe({ id, base, erro, ok }: { id: string; base: "/app" | "/meu"; erro?: string; ok?: string }) {
  const org = await requireOrg();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: insp }, { data: resp }, { data: ass }] = await Promise.all([
    supabase
      .from("inspections")
      .select(
        "id, number, location, created_by, inspected_on, inspector, status, notes, equipment_tag, inspected_at, inspector_document, company_name, checklist_templates(name, equipment, signature_roles), sectors(name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("inspection_answers")
      .select("id, position, question, answer, comment, photo_path, photo_name, action_id, actions(number, status, plan_id)")
      .eq("inspection_id", id)
      .order("position"),
    supabase
      .from("inspection_signatures")
      .select("id, role, signer_name, signer_document, image, signed_at, ip, device, hash")
      .eq("inspection_id", id)
      .order("signed_at"),
  ]);
  if (!insp) notFound();
  const i = insp as unknown as Inspecao;
  const respostas = (resp ?? []) as unknown as Resposta[];
  const concluida = i.status === "concluida";
  const equipe = podeAprovar(org.role);
  const editavel = !concluida && (equipe || i.created_by === user?.id);
  const assinaturas = (ass ?? []) as Assinatura[];
  const assinada = assinaturas.length > 0;
  const papeis = i.checklist_templates?.signature_roles?.length ? i.checklist_templates.signature_roles : ["Inspetor"];
  const faltaAssinar = papeis.filter((p) => !assinaturas.some((a) => a.role === p));
  const at = atendimento(respostas);
  const voltar = `${base}/inspecoes/${i.id}`;
  const caminhos = respostas.map((r) => r.photo_path).filter(Boolean) as string[];
  const fotos = new Map<string, string>();
  if (caminhos.length) {
    const { data: assinadas } = await supabase.storage.from("evidencias").createSignedUrls(caminhos, 3600);
    for (const f of assinadas ?? []) if (f.path && f.signedUrl) fotos.set(f.path, f.signedUrl);
  }
  const nAcoes = Number(ok?.split("-")[1] ?? 0);

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href={`${base}/inspecoes`} className="text-sm text-emerald-700 underline">← Inspeções</Link>
        <BotaoImprimir />
      </div>
      <h1 className="mt-3 text-xl font-bold">
        {numeroInspecao(i.number)} · {i.checklist_templates?.name}
        {i.equipment_tag ? ` · ${i.equipment_tag}` : ""}
      </h1>
      <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm text-slate-600 sm:grid-cols-3">
        <div><dt className="inline text-slate-400">Data e hora: </dt><dd className="inline">{dataBR(i.inspected_on)}{i.inspected_at ? ` ${i.inspected_at.slice(0, 5)}` : ""}</dd></div>
        <div><dt className="inline text-slate-400">Local: </dt><dd className="inline">{[i.sectors?.name, i.location].filter(Boolean).join(" · ") || "—"}</dd></div>
        <div><dt className="inline text-slate-400">Empresa: </dt><dd className="inline">{i.company_name ?? org.name}</dd></div>
        <div><dt className="inline text-slate-400">Inspetor: </dt><dd className="inline">{i.inspector ?? "—"}{i.inspector_document ? ` (${i.inspector_document})` : ""}</dd></div>
        <div><dt className="inline text-slate-400">Situação: </dt><dd className="inline">{assinada ? "concluída e assinada" : concluida ? "concluída" : "em andamento"}</dd></div>
      </dl>
      {concluida && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <p>
            Atendimento: <strong>{at.pct === null ? "—" : `${at.pct}%`}</strong> ({at.sim} Sim, {at.nao} Não, {at.na} N/A · Sim ÷ (Sim + Não))
          </p>
          {i.checklist_templates?.equipment && (
            <p className={`mt-1 font-medium ${at.nao ? "text-amber-800" : "text-emerald-800"}`}>
              {at.nao
                ? `Equipamento só pode ser liberado depois de tratar ${at.nao} item(ns) com "Não" (ações abertas no plano de ação).`
                : "Equipamento liberado: 100% de atendimento nos itens aplicáveis."}
            </p>
          )}
        </div>
      )}
      <Erro mensagem={erro} />
      {ok && (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 print:hidden">
          {ok?.startsWith("concluida")
            ? nAcoes
              ? `Inspeção concluída. ${nAcoes} não conformidade(s) viraram ações no plano de ação.`
              : "Inspeção concluída, sem não conformidades."
            : ok === "assinada"
              ? "Assinatura registrada."
              : "Respostas salvas."}
        </p>
      )}

      <form action={salvarRespostas} className="mt-4">
        <input type="hidden" name="id" value={i.id} />
        <input type="hidden" name="voltar" value={voltar} />
        <ol className="space-y-3">
          {respostas.map((r, n) => (
            <li key={r.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-3 text-sm">
              <p className="font-medium">{n + 1}. {r.question}</p>
              {!editavel ? (
                <p className="mt-1">
                  <span className={RESPOSTAS[r.answer ?? ""]?.classe}>{RESPOSTAS[r.answer ?? ""]?.texto ?? "—"}</span>
                  {r.comment ? ` · ${r.comment}` : ""}
                  {r.actions &&
                    (base === "/app" ? (
                      <Link href={`/app/acoes/plano/${r.actions.plan_id}`} className="ml-2 text-emerald-700 underline">
                        Ação #{String(r.actions.number).padStart(4, "0")}
                      </Link>
                    ) : (
                      <span className="ml-2 text-emerald-700">virou a ação #{String(r.actions.number).padStart(4, "0")}</span>
                    ))}
                </p>
              ) : (
                <>
                  <div className="mt-2 flex flex-wrap gap-4">
                    {Object.entries(RESPOSTAS).map(([v, l]) => (
                      <label key={v} className="flex items-center gap-1">
                        <input type="radio" name={`r_${r.id}`} value={v} defaultChecked={r.answer === v} /> {l.texto}
                      </label>
                    ))}
                  </div>
                  <input
                    name={`c_${r.id}`}
                    defaultValue={r.comment ?? ""}
                    className="input mt-2"
                    placeholder="Observação (obrigatória quando a resposta for Não)"
                  />
                  <label className="mt-2 block text-xs text-slate-600 print:hidden">
                    {r.photo_path ? "Trocar a foto" : "Foto (opcional)"}
                    <input name={`f_${r.id}`} type="file" accept="image/*" capture="environment" className="mt-1 block w-full text-xs" />
                  </label>
                </>
              )}
              {r.photo_path && fotos.get(r.photo_path) && (
                <a href={fotos.get(r.photo_path)} target="_blank" rel="noreferrer" className="mt-2 block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fotos.get(r.photo_path)} alt={r.photo_name ?? "foto"} className="h-28 rounded border border-slate-200 object-cover" />
                </a>
              )}
            </li>
          ))}
        </ol>
        <label className="mt-4 block text-sm">
          Observações gerais
          {!editavel ? (
            <p className="mt-1">{i.notes ?? "—"}</p>
          ) : (
            <textarea name="obs" defaultValue={i.notes ?? ""} rows={2} className="input mt-1" />
          )}
        </label>
        {editavel && (
          <div className="mt-4 flex flex-wrap gap-3 print:hidden">
            <button className="btn-ghost" name="concluir" value="0">Salvar e continuar depois</button>
            <button className="btn" name="concluir" value="1">Concluir e gerar ações</button>
          </div>
        )}
      </form>

      {concluida && (
        <section id="assinaturas" className="mt-8 scroll-mt-20">
          <h2 className="font-semibold text-slate-900">Assinaturas</h2>
          <p className="text-xs text-slate-500">
            Cada assinatura guarda nome, documento, data e hora, IP, aparelho e um código de verificação (hash). Depois da
            primeira assinatura, a inspeção não pode mais ser alterada.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {assinaturas.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <p className="text-xs font-medium text-slate-500">{a.role}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.image} alt={`Assinatura de ${a.signer_name}`} className="mt-1 h-20 rounded bg-[#fff]" />
                <p className="mt-1 font-medium text-slate-900">{a.signer_name} · {a.signer_document}</p>
                <p className="text-xs text-slate-500">
                  {dataHora(a.signed_at)}{a.ip ? ` · IP ${a.ip}` : ""}
                </p>
                <p className="break-all font-mono text-[10px] text-slate-400" title={a.device ?? undefined}>hash {a.hash}</p>
              </div>
            ))}
          </div>
          {faltaAssinar.length > 0 && (
            <form action={assinarInspecao} className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm sm:grid-cols-2 print:hidden">
              <input type="hidden" name="id" value={i.id} />
              <input type="hidden" name="voltar" value={voltar} />
              <label>
                Assinar como
                <select name="papel" className="input mt-1">
                  {faltaAssinar.map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
              <label>
                Nome completo
                <input name="nome" required className="input mt-1" />
              </label>
              <label>
                Matrícula ou documento
                <input name="documento" required className="input mt-1" />
              </label>
              <div className="sm:col-span-2">
                <QuadroAssinatura />
              </div>
              <label className="flex items-start gap-2 sm:col-span-2">
                <input type="checkbox" name="ciente" className="mt-1" />
                <span>Declaro que conferi as respostas desta inspeção e que esta é a minha assinatura.</span>
              </label>
              <div className="sm:col-span-2">
                <button className="btn">Assinar</button>
              </div>
            </form>
          )}
        </section>
      )}

      <div className="mt-8 flex gap-6 print:hidden">
        {concluida && equipe && !assinada && (
          <form action={reabrirInspecao}>
            <input type="hidden" name="id" value={i.id} />
            <input type="hidden" name="voltar" value={voltar} />
            <button className="text-xs text-slate-600 hover:underline">Reabrir para corrigir</button>
          </form>
        )}
        {editavel && !assinada && (
          <form action={excluirInspecao}>
            <input type="hidden" name="id" value={i.id} />
            <input type="hidden" name="voltar" value={voltar} />
            <button className="text-xs text-red-600 hover:underline">Excluir inspeção</button>
          </form>
        )}
      </div>
    </div>
  );
}
