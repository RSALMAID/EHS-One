import Link from "next/link";
import { Erro } from "@/components/Erro";
import { dataBR, diasAte, hoje, somarDias } from "@/lib/datas";
import { requireOrg } from "@/lib/org";
import { lancaAso, RESULTADOS, situacaoExame, TIPOS_ASO, veExames, type ExameFeito, type Exigencia } from "@/lib/saude";
import { createClient } from "@/lib/supabase/server";
import { criarAcaoSaude, registrarAso } from "./actions";

type Props = { searchParams: Promise<{ erro?: string; ok?: string; trabalhador?: string }> };

type Aso = {
  id: string;
  worker_id: string;
  kind: string;
  issued_on: string;
  result: string;
  next_due: string | null;
  workers: { full_name: string } | null;
};

function BotaoAcao({ ref_, problema, acao }: { ref_: string; problema: string; acao: string }) {
  return (
    <form action={criarAcaoSaude}>
      <input type="hidden" name="ref" value={ref_} />
      <input type="hidden" name="problema" value={problema} />
      <input type="hidden" name="acao" value={acao} />
      <input type="hidden" name="prazo" value={somarDias(hoje(), 15)} />
      <button className="text-xs text-emerald-700 hover:underline">Criar ação</button>
    </form>
  );
}

export default async function SaudePage({ searchParams }: Props) {
  const { erro, ok, trabalhador } = await searchParams;
  const org = await requireOrg();
  if (org.role === "trabalhador" || org.role === "consultor") {
    return <p className="text-sm text-slate-600">Seu perfil não tem acesso à saúde ocupacional.</p>;
  }
  const exames = veExames(org.role);
  const supabase = await createClient();
  const [{ data: trabalhadores }, { data: asosData }, { data: exigencias }, { data: feitos }, { data: tipos }] =
    await Promise.all([
      supabase
        .from("workers")
        .select("id, full_name, job_role_id")
        .eq("organization_id", org.id)
        .eq("active", true)
        .order("full_name"),
      supabase
        .from("asos")
        .select("id, worker_id, kind, issued_on, result, next_due, workers(full_name)")
        .eq("organization_id", org.id)
        .order("issued_on", { ascending: false }),
      supabase.from("exam_job_roles").select("exam_type_id, job_role_id, periodicity_months").eq("organization_id", org.id),
      exames
        ? supabase.from("worker_exams").select("worker_id, exam_type_id, performed_on").eq("organization_id", org.id)
        : Promise.resolve({ data: [] as ExameFeito[] }),
      supabase.from("exam_types").select("id, name").eq("organization_id", org.id),
    ]);
  const asos = (asosData ?? []) as unknown as Aso[];
  const ativos = trabalhadores ?? [];
  const ultimoAso = (wid: string) => asos.find((a) => a.worker_id === wid);

  const semAso = ativos.filter((w) => !ultimoAso(w.id));
  const periodicos = ativos
    .map((w) => ({ w, a: ultimoAso(w.id) }))
    .filter(({ a }) => a && a.kind !== "demissional" && a.next_due && diasAte(a.next_due) <= 30)
    .sort((x, y) => (x.a!.next_due! < y.a!.next_due! ? -1 : 1));
  const restricoes = ativos
    .map((w) => ({ w, a: ultimoAso(w.id) }))
    .filter(({ a }) => a && a.result !== "apto");
  const nomeExame = (id: string) => tipos?.find((t) => t.id === id)?.name ?? "";
  const examesPend = exames
    ? ativos.flatMap((w) =>
        ((exigencias ?? []) as Exigencia[])
          .filter((e) => e.job_role_id === w.job_role_id)
          .map((e) => ({ w, e, s: situacaoExame(e, (feitos ?? []) as ExameFeito[], w.id) }))
          .filter((x) => x.s.tipo !== "ok"),
      )
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Saúde ocupacional</h1>
      <p className="mt-1 text-sm text-slate-600">
        ASO de cada trabalhador e exames do PCMSO por cargo. Dados de saúde: exames só aparecem para proprietário,
        administrador EHS e médico.
      </p>
      <div className="mt-3 flex gap-3">
        <Link href="/app/saude/exames" className="btn-ghost">Exames por cargo (PCMSO)</Link>
      </div>
      <Erro mensagem={erro} />
      {ok && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">ASO registrado.</p>}

      <h2 className="mt-6 text-lg font-semibold">Pendências</h2>
      <div className="mt-2 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <p className="font-semibold">Sem ASO ({semAso.length})</p>
          <ul className="mt-1 space-y-1">
            {semAso.map((w) => (
              <li key={w.id} className="flex justify-between gap-2">
                <Link href={`/app/saude/trabalhador/${w.id}`} className="underline">{w.full_name}</Link>
                <Link href={`/app/saude?trabalhador=${w.id}#novo-aso`} className="text-xs text-emerald-700 hover:underline">Lançar ASO</Link>
              </li>
            ))}
            {!semAso.length && <li className="text-slate-500">Nenhum.</li>}
          </ul>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <p className="font-semibold">Periódico vencido ou em 30 dias ({periodicos.length})</p>
          <ul className="mt-1 space-y-1">
            {periodicos.map(({ w, a }) => {
              const dias = diasAte(a!.next_due!);
              return (
                <li key={w.id} className="flex justify-between gap-2">
                  <span>
                    <Link href={`/app/saude/trabalhador/${w.id}`} className="underline">{w.full_name}</Link> ·{" "}
                    <span className={dias < 0 ? "text-red-700" : "text-amber-700"}>
                      {dias < 0 ? "vencido em" : "vence em"} {dataBR(a!.next_due)}
                    </span>
                  </span>
                  <BotaoAcao
                    ref_={w.id}
                    problema={`ASO periódico de ${w.full_name} ${dias < 0 ? "vencido" : "vencendo"} em ${dataBR(a!.next_due)}`}
                    acao={`Agendar exame periódico de ${w.full_name}`}
                  />
                </li>
              );
            })}
            {!periodicos.length && <li className="text-slate-500">Nenhum.</li>}
          </ul>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <p className="font-semibold">Último ASO com restrição ou inapto ({restricoes.length})</p>
          <ul className="mt-1 space-y-1">
            {restricoes.map(({ w, a }) => (
              <li key={w.id}>
                <Link href={`/app/saude/trabalhador/${w.id}`} className="underline">{w.full_name}</Link> ·{" "}
                <span className={RESULTADOS[a!.result].classe}>{RESULTADOS[a!.result].texto}</span>
              </li>
            ))}
            {!restricoes.length && <li className="text-slate-500">Nenhum.</li>}
          </ul>
        </section>
        {exames && (
          <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
            <p className="font-semibold">Exames do PCMSO pendentes ({examesPend.length})</p>
            <ul className="mt-1 space-y-1">
              {examesPend.map(({ w, e, s }) => (
                <li key={w.id + e.exam_type_id}>
                  <Link href={`/app/saude/trabalhador/${w.id}`} className="underline">{w.full_name}</Link> ·{" "}
                  {nomeExame(e.exam_type_id)} ·{" "}
                  <span className={s.tipo === "vence" ? "text-amber-700" : "text-red-700"}>
                    {s.tipo === "nunca" ? "nunca feito" : s.tipo === "vencido" ? `vencido em ${dataBR(s.vence)}` : `vence em ${dataBR(s.vence)}`}
                  </span>
                </li>
              ))}
              {!examesPend.length && <li className="text-slate-500">Nenhum.</li>}
            </ul>
          </section>
        )}
      </div>

      {lancaAso(org.role) && (
        <form id="novo-aso" action={registrarAso} className="mt-8 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3">
          <p className="font-semibold sm:col-span-3">Lançar ASO</p>
          <label className="text-sm">
            Trabalhador
            <select name="trabalhador" required defaultValue={trabalhador ?? ""} className="input mt-1">
              <option value="">— escolha —</option>
              {ativos.map((w) => (
                <option key={w.id} value={w.id}>{w.full_name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Tipo
            <select name="tipo" className="input mt-1">
              {Object.entries(TIPOS_ASO).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Data do ASO
            <input name="data" type="date" required defaultValue={hoje()} className="input mt-1" />
          </label>
          <label className="text-sm">
            Resultado
            <select name="resultado" className="input mt-1">
              {Object.entries(RESULTADOS).map(([v, r]) => (
                <option key={v} value={v}>{r.texto}</option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            Restrições (se houver)
            <input name="restricoes" className="input mt-1" />
          </label>
          <label className="text-sm">
            Médico
            <input name="medico" className="input mt-1" />
          </label>
          <label className="text-sm">
            CRM
            <input name="crm" className="input mt-1" />
          </label>
          <label className="text-sm">
            Próximo periódico em (meses)
            <input name="meses" type="number" min={1} defaultValue={12} className="input mt-1" />
            <span className="text-xs text-slate-500">ou informe a data abaixo</span>
          </label>
          <label className="text-sm">
            Próximo periódico (data)
            <input name="proximo" type="date" className="input mt-1" />
          </label>
          <div className="sm:col-span-3">
            <button className="btn">Lançar ASO</button>
          </div>
        </form>
      )}

      <h2 className="mt-8 text-lg font-semibold">Últimos ASOs</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {asos.slice(0, 30).map((a) => (
          <li key={a.id} className="px-4 py-2">
            {dataBR(a.issued_on)} ·{" "}
            <Link href={`/app/saude/trabalhador/${a.worker_id}`} className="underline">{a.workers?.full_name}</Link> ·{" "}
            {TIPOS_ASO[a.kind]} · <span className={RESULTADOS[a.result].classe}>{RESULTADOS[a.result].texto}</span>
            {a.next_due ? ` · próximo ${dataBR(a.next_due)}` : ""}
          </li>
        ))}
        {!asos.length && <li className="px-4 py-4 text-center text-slate-500">Nenhum ASO lançado.</li>}
      </ul>
    </div>
  );
}
