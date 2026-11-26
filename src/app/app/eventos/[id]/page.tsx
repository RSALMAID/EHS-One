import Link from "next/link";
import { notFound } from "next/navigation";
import { Erro } from "@/components/Erro";
import { MatrizRisco } from "@/components/MatrizRisco";
import { numero } from "@/lib/acoes";
import { CATEGORIAS_6M, METODOS, numeroEvento, STATUS_EVENTO, TIPOS_EVENTO } from "@/lib/eventos";
import { requireOrg } from "@/lib/org";
import { NivelBadge, PROBABILIDADE, SEVERIDADE, TIPOS_RISCO } from "@/lib/risco";
import { opcoesSetor } from "@/lib/setores";
import { createClient } from "@/lib/supabase/server";
import {
  adicionarCausa,
  alternarRaiz,
  anexarFotos,
  criarAcaoEvento,
  removerCausa,
  salvarEvento,
  salvarInvestigacao,
} from "../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> };

type Causa = {
  id: string;
  parent_id: string | null;
  category: string | null;
  description: string;
  is_root: boolean;
  action_id: string | null;
  actions: { number: number; status: string } | null;
};

const ACIDENTE = ["acidente_com_afastamento", "acidente_sem_afastamento", "primeiros_socorros"];
const AMBIENTAL = ["ambiental", "desvio_ambiental"];

function paraInput(iso: string) {
  return new Date(iso).toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).slice(0, 16).replace(" ", "T");
}

export default async function EventoPage({ params, searchParams }: Props) {
  const [{ id }, { erro }] = await Promise.all([params, searchParams]);
  const org = await requireOrg();
  const supabase = await createClient();
  const { data: e } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!e) notFound();
  const [setores, { data: trabalhadores }, { data: arquivos }, { data: inv }, { data: causasData }, { data: plano }] =
    await Promise.all([
      opcoesSetor(org.id),
      supabase.from("workers").select("id, full_name").eq("organization_id", org.id).order("full_name"),
      supabase.from("event_files").select("id, file_path, file_name").eq("event_id", id),
      supabase.from("event_investigations").select("*").eq("event_id", id).maybeSingle(),
      supabase
        .from("event_causes")
        .select("id, parent_id, category, description, is_root, action_id, actions(number, status)")
        .eq("event_id", id)
        .order("position"),
      supabase.from("action_plans").select("id, number").eq("origin", "ocorrencia").eq("origin_ref", id).maybeSingle(),
    ]);
  const causas = (causasData ?? []) as unknown as Causa[];
  const caminhos = (arquivos ?? []).map((a) => a.file_path);
  const { data: urls } = caminhos.length
    ? await supabase.storage.from("evidencias").createSignedUrls(caminhos, 3600)
    : { data: [] };
  const metodo = inv?.method ?? "arvore";
  const acidente = ACIDENTE.includes(e.kind);
  const ambiental = AMBIENTAL.includes(e.kind);

  const BotoesCausa = ({ c }: { c: Causa }) => (
    <span className="ml-2 inline-flex gap-2 text-xs">
      <form action={alternarRaiz} className="inline">
        <input type="hidden" name="id" value={c.id} />
        <input type="hidden" name="evento" value={id} />
        <input type="hidden" name="raiz" value={String(c.is_root)} />
        <button className={c.is_root ? "font-semibold text-red-700" : "text-slate-500 hover:underline"}>
          {c.is_root ? "causa raiz ✓" : "marcar como raiz"}
        </button>
      </form>
      {c.actions && (
        <Link href="/app/acoes/todas?status=todas" className="text-emerald-700 underline">ação {numero(c.actions.number)}</Link>
      )}
      <form action={removerCausa} className="inline">
        <input type="hidden" name="id" value={c.id} />
        <input type="hidden" name="evento" value={id} />
        <button className="text-red-600 hover:underline">remover</button>
      </form>
    </span>
  );

  const Arvore = ({ pai, nivel }: { pai: string | null; nivel: number }) => {
    const filhos = causas.filter((c) => c.parent_id === pai);
    if (!filhos.length) return null;
    return (
      <ul className={nivel ? "ml-5 border-l border-slate-200 pl-3" : ""}>
        {filhos.map((c) => (
          <li key={c.id} className="py-1">
            {metodo === "cinco_porques" && <span className="text-xs text-slate-500">Por quê {nivel + 1}? </span>}
            {c.description}
            <BotoesCausa c={c} />
            <Arvore pai={c.id} nivel={nivel + 1} />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      <Link href="/app/eventos" className="text-sm text-emerald-700 underline">← Eventos e desvios</Link>
      <h1 className="mt-3 text-2xl font-bold">
        {numeroEvento(e.number)} · {TIPOS_EVENTO[e.kind].nome}
      </h1>
      <p className="text-sm text-slate-600">
        {STATUS_EVENTO[e.status]} · entra nas taxas: {TIPOS_EVENTO[e.kind].taxa}
        {e.hide_reporter ? " · relator pediu para não mostrar o nome" : ""}
        {plano && (
          <>
            {" · "}
            <Link href={`/app/acoes/plano/${plano.id}`} className="text-emerald-700 underline">Plano {numero(plano.number)}</Link>
          </>
        )}
      </p>
      <Erro mensagem={erro} />

      <form action={salvarEvento} className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-2">
        <input type="hidden" name="id" value={e.id} />
        <p className="font-semibold sm:col-span-2">Registro e classificação</p>
        <label>
          Tipo
          <select name="tipo" defaultValue={e.kind} className="input mt-1">
            {Object.entries(TIPOS_EVENTO).map(([k, t]) => (
              <option key={k} value={k}>{t.nome}</option>
            ))}
          </select>
        </label>
        <label>
          Situação
          <select name="status" defaultValue={e.status} className="input mt-1">
            {Object.entries(STATUS_EVENTO).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Quando
          <input name="quando" type="datetime-local" defaultValue={paraInput(e.occurred_at)} className="input mt-1" />
        </label>
        <label>
          Setor
          <select name="setor" defaultValue={e.sector_id ?? ""} className="input mt-1">
            <option value="">—</option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          Local exato
          <input name="local" defaultValue={e.location ?? ""} className="input mt-1" />
        </label>
        <label className="sm:col-span-2">
          O que aconteceu
          <textarea name="descricao" defaultValue={e.description} rows={3} className="input mt-1" />
        </label>
        <label className="sm:col-span-2">
          Ação imediata
          <input name="imediata" defaultValue={e.immediate_action ?? ""} className="input mt-1" />
        </label>

        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              Severidade potencial
              <select name="severidade" defaultValue={e.severity ?? ""} className="input mt-1">
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{SEVERIDADE[n]}</option>
                ))}
              </select>
            </label>
            <label>
              Probabilidade de repetir
              <select name="probabilidade" defaultValue={e.probability ?? ""} className="input mt-1">
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{PROBABILIDADE[n]}</option>
                ))}
              </select>
            </label>
            <label>
              Tipologia do risco
              <select name="tipo_risco" defaultValue={e.risk_type ?? ""} className="input mt-1">
                <option value="">—</option>
                {Object.entries(TIPOS_RISCO).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </label>
            {e.potential_level && (
              <p className="sm:col-span-3">
                Potencial: <NivelBadge nivel={e.potential_level} />
              </p>
            )}
          </div>
          <MatrizRisco severidade={e.severity} probabilidade={e.probability} />
        </div>

        {acidente && (
          <>
            <p className="font-semibold sm:col-span-2">Lesão</p>
            <label>
              Acidentado
              <select name="acidentado" defaultValue={e.injured_worker_id ?? ""} className="input mt-1">
                <option value="">—</option>
                {(trabalhadores ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </label>
            <label>
              Nº da CAT
              <input name="cat" defaultValue={e.cat_number ?? ""} className="input mt-1" />
            </label>
            <label>
              Natureza da lesão
              <input name="natureza" defaultValue={e.injury_nature ?? ""} className="input mt-1" placeholder="Corte, contusão, fratura" />
            </label>
            <label>
              Parte do corpo
              <input name="parte" defaultValue={e.body_part ?? ""} className="input mt-1" placeholder="Mão esquerda" />
            </label>
            <label>
              Dias perdidos
              <input name="dias_perdidos" type="number" min={0} defaultValue={e.lost_days ?? ""} className="input mt-1" />
            </label>
            <label>
              Dias debitados (NBR 14280)
              <input name="dias_debitados" type="number" min={0} defaultValue={e.debited_days ?? ""} className="input mt-1" />
            </label>
          </>
        )}
        {!acidente && (
          <>
            <input type="hidden" name="acidentado" value={e.injured_worker_id ?? ""} />
          </>
        )}
        {ambiental && (
          <label className="sm:col-span-2">
            Aspecto ambiental
            <input name="aspecto" defaultValue={e.env_aspect ?? ""} className="input mt-1" placeholder="Vazamento de óleo no solo" />
          </label>
        )}
        <div className="sm:col-span-2">
          <button className="btn">Salvar</button>
        </div>
      </form>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm">
        <p className="font-semibold">Fotos</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(urls ?? []).map((u, i) =>
            u.signedUrl ? (
              <a key={i} href={u.signedUrl} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.signedUrl} alt={arquivos?.[i]?.file_name ?? "foto"} className="h-24 w-24 rounded object-cover" />
              </a>
            ) : null,
          )}
          {!caminhos.length && <p className="text-slate-500">Nenhuma foto.</p>}
        </div>
        <form action={anexarFotos} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={e.id} />
          <input name="fotos" type="file" accept="image/*,application/pdf" multiple className="text-xs" />
          <button className="btn-ghost px-2 py-1 text-xs">Anexar</button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm">
        <p className="font-semibold">Investigação e análise de causas</p>
        <form action={salvarInvestigacao} className="mt-2 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={e.id} />
          <label>
            Método
            <select name="metodo" defaultValue={metodo} className="input mt-1">
              {Object.entries(METODOS).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Equipe
            <input name="equipe" defaultValue={inv?.team ?? ""} className="input mt-1" placeholder="Técnico, supervisor, CIPA" />
          </label>
          <label className="sm:col-span-2">
            Conclusão
            <textarea name="conclusao" defaultValue={inv?.summary ?? ""} rows={2} className="input mt-1" />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="concluida" defaultChecked={!!inv?.concluded_at} /> Investigação concluída
          </label>
          <div>
            <button className="btn-ghost">Salvar investigação</button>
          </div>
        </form>

        <div className="mt-4">
          {metodo === "ishikawa" ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.entries(CATEGORIAS_6M).map(([k, l]) => (
                <div key={k} className="rounded border border-slate-200 p-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">{l}</p>
                  <ul>
                    {causas
                      .filter((c) => c.category === k)
                      .map((c) => (
                        <li key={c.id} className="py-1">
                          {c.description}
                          <BotoesCausa c={c} />
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                {metodo === "cinco_porques"
                  ? "Comece pelo fato e pergunte “por quê?” ligando cada resposta à anterior."
                  : "Comece pelo evento e ligue cada fato aos fatos que o causaram."}
              </p>
              <Arvore pai={null} nivel={0} />
            </>
          )}
          {!causas.length && <p className="text-slate-500">Nenhuma causa registrada.</p>}
        </div>

        <form action={adicionarCausa} className="mt-3 grid gap-2 sm:grid-cols-[2fr_1fr_auto_auto] sm:items-end">
          <input type="hidden" name="id" value={e.id} />
          <label>
            {metodo === "cinco_porques" ? "Resposta do porquê" : "Causa ou fato"}
            <input name="descricao" required className="input mt-1" />
          </label>
          {metodo === "ishikawa" ? (
            <label>
              Categoria
              <select name="categoria" className="input mt-1">
                {Object.entries(CATEGORIAS_6M).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              Ligada a
              <select name="pai" defaultValue={causas.at(-1)?.id ?? ""} className="input mt-1">
                <option value="">— início —</option>
                {causas.map((c) => (
                  <option key={c.id} value={c.id}>{c.description.slice(0, 40)}</option>
                ))}
              </select>
            </label>
          )}
          <label className="flex items-center gap-1 pb-2">
            <input type="checkbox" name="raiz" /> raiz
          </label>
          <button className="btn-ghost">Adicionar</button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm">
        <p className="font-semibold">Ações para as causas</p>
        <p className="text-xs text-slate-500">As ações entram no plano deste evento, na Gestão › Plano de ação.</p>
        <form action={criarAcaoEvento} className="mt-2 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="evento" value={e.id} />
          <label>
            Causa tratada
            <select name="causa" className="input mt-1">
              <option value="">—</option>
              {causas
                .filter((c) => c.is_root && !c.action_id)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.description.slice(0, 60)}</option>
                ))}
            </select>
          </label>
          <label>
            Problema
            <input name="problema" className="input mt-1" placeholder="Prateleira sem trava" />
          </label>
          <label className="sm:col-span-2">
            Ação
            <input name="acao" required className="input mt-1" placeholder="Instalar travas e incluir prateleiras na inspeção mensal" />
          </label>
          <label>
            Responsável
            <select name="responsavel" className="input mt-1">
              <option value="">—</option>
              {(trabalhadores ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </label>
          <label>
            Prazo
            <input name="prazo" type="date" className="input mt-1" />
          </label>
          <div>
            <button className="btn">Criar ação</button>
          </div>
        </form>
      </section>
    </div>
  );
}
