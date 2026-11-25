import Link from "next/link";
import { notFound } from "next/navigation";
import { AcaoCard, CAMPOS_ACAO, type AcaoLinha } from "@/components/AcaoCard";
import { Erro } from "@/components/Erro";
import { numero, ORIGENS, STATUS_PLANO } from "@/lib/acoes";
import { evidenciasDe } from "@/lib/evidencias";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { criarAcao, salvarPlano } from "../../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> };

export default async function PlanoPage({ params, searchParams }: Props) {
  const [{ id }, { erro }] = await Promise.all([params, searchParams]);
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: p }, { data: acoesData }, { data: trabalhadores }] = await Promise.all([
    supabase
      .from("action_plans")
      .select("id, number, title, objective, origin, owner_id, due_date, status")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("actions").select(CAMPOS_ACAO).eq("plan_id", id).order("number"),
    supabase.from("workers").select("id, full_name").eq("organization_id", org.id).eq("active", true).order("full_name"),
  ]);
  if (!p) notFound();
  const acoes = (acoesData ?? []) as unknown as AcaoLinha[];
  const evidencias = await evidenciasDe(acoes.map((a) => a.id));
  const voltar = `/app/acoes/plano/${id}`;

  const SelectPessoa = ({ name, value }: { name: string; value?: string | null }) => (
    <select name={name} defaultValue={value ?? ""} className="input mt-1">
      <option value="">—</option>
      {(trabalhadores ?? []).map((t) => (
        <option key={t.id} value={t.id}>{t.full_name}</option>
      ))}
    </select>
  );

  return (
    <div>
      <Link href="/app/acoes" className="text-sm text-emerald-700 underline">← Planos de ação</Link>
      <h1 className="mt-3 text-2xl font-bold">
        Plano {numero(p.number)} · {p.title}
      </h1>
      <p className="text-sm text-slate-600">Origem: {ORIGENS[p.origin]}</p>
      <Erro mensagem={erro} />

      <details className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">Dados do plano</summary>
        <form action={salvarPlano} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={p.id} />
          <label className="text-sm sm:col-span-2">
            Título
            <input name="titulo" required defaultValue={p.title} className="input mt-1" />
          </label>
          <label className="text-sm sm:col-span-2">
            Objetivo
            <input name="objetivo" defaultValue={p.objective ?? ""} className="input mt-1" />
          </label>
          <label className="text-sm">
            Dono do plano
            <SelectPessoa name="dono" value={p.owner_id} />
          </label>
          <label className="text-sm">
            Prazo final
            <input name="prazo" type="date" defaultValue={p.due_date ?? ""} className="input mt-1" />
          </label>
          <label className="text-sm">
            Situação
            <select name="status" defaultValue={p.status} className="input mt-1">
              {Object.entries(STATUS_PLANO).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button className="btn">Salvar plano</button>
          </div>
        </form>
      </details>

      <form action={criarAcao} className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <input type="hidden" name="plano" value={p.id} />
        <p className="font-semibold sm:col-span-2">Nova ação neste plano</p>
        <label className="text-sm">
          Problema
          <input name="problema" required className="input mt-1" placeholder="Esmeril sem proteção" />
        </label>
        <label className="text-sm">
          Ação
          <input name="acao" required className="input mt-1" placeholder="Instalar proteção fixa" />
        </label>
        <label className="text-sm">
          Responsável
          <SelectPessoa name="responsavel" />
        </label>
        <label className="text-sm">
          Prazo
          <input name="prazo" type="date" className="input mt-1" />
        </label>
        <label className="text-sm sm:col-span-2">
          Evidência esperada (opcional)
          <input name="evidencia" className="input mt-1" placeholder="Foto da proteção instalada" />
        </label>
        <div>
          <button className="btn">Adicionar ação</button>
        </div>
      </form>

      <ul className="mt-6 space-y-2">
        {acoes.map((a) => (
          <AcaoCard key={a.id} a={a} voltar={voltar} evidencias={evidencias.filter((e) => e.action_id === a.id)} />
        ))}
        {!acoes.length && (
          <li className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Nenhuma ação neste plano ainda.
          </li>
        )}
      </ul>
    </div>
  );
}
