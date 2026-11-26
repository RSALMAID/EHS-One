import Link from "next/link";
import { Erro } from "@/components/Erro";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { adicionarTrabalhador, atualizarVinculo, cancelarConvite, convidar } from "./actions";

type Props = { searchParams: Promise<{ erro?: string }> };

export default async function TrabalhadoresPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: trabalhadores }, { data: setores }, { data: unidades }, { data: cargos }, { data: convites }] = await Promise.all([
    supabase
      .from("workers")
      .select("id, full_name, email, is_contractor, active, sector_id, job_role_id, user_id")
      .eq("organization_id", org.id)
      .order("active", { ascending: false })
      .order("full_name"),
    supabase.from("sectors").select("id, name, unit_id").eq("organization_id", org.id).order("name"),
    supabase.from("units").select("id, name").eq("organization_id", org.id),
    supabase.from("job_roles").select("id, name").eq("organization_id", org.id).order("name"),
    supabase.from("invitations").select("id, worker_id, email").eq("organization_id", org.id).is("accepted_at", null),
  ]);
  const h = await headers();
  const site = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const convite = (wid: string) => convites?.find((c) => c.worker_id === wid);
  const nomeUnidade = (id: string) => unidades?.find((u) => u.id === id)?.name ?? "";
  const opcoesSetor = (setores ?? []).map((s) => ({ id: s.id, label: `${s.name} (${nomeUnidade(s.unit_id)})` }));

  const SelectSetor = ({ value }: { value?: string | null }) => (
    <select name="setor" defaultValue={value ?? ""} className="input mt-1">
      <option value="">— sem setor —</option>
      {opcoesSetor.map((s) => (
        <option key={s.id} value={s.id}>{s.label}</option>
      ))}
    </select>
  );
  const SelectCargo = ({ value }: { value?: string | null }) => (
    <select name="cargo" defaultValue={value ?? ""} className="input mt-1">
      <option value="">— sem cargo —</option>
      {(cargos ?? []).map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );

  return (
    <div>
      <h1 className="titulo">Trabalhadores</h1>
      <p className="mt-1 text-sm text-slate-600">
        O vínculo trabalhador → cargo → setor é o que liga cada pessoa aos riscos, exames, EPIs e
        treinamentos. Importação por Excel/CSV chega em seguida.
      </p>
      <Erro mensagem={erro} />

      <form action={adicionarTrabalhador} className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm">
          Nome completo
          <input name="nome" required className="input mt-1" />
        </label>
        <label className="text-sm">
          E-mail (opcional)
          <input name="email" type="email" className="input mt-1" />
        </label>
        <label className="text-sm">
          Setor
          <SelectSetor />
        </label>
        <label className="text-sm">
          Cargo
          <SelectCargo />
        </label>
        <label className="flex items-center gap-2 text-sm sm:pt-6">
          <input name="terceiro" type="checkbox" /> Terceiro
        </label>
        <div className="sm:pt-5">
          <button className="btn">Adicionar</button>
        </div>
      </form>

      <ul className="mt-6 space-y-2">
        {(trabalhadores ?? []).map((t) => (
          <li key={t.id} className={`rounded-xl border border-slate-200 bg-white shadow-sm p-4 ${t.active ? "" : "opacity-60"}`}>
            <p className="font-medium">
              {t.full_name}{" "}
              <span className="text-sm font-normal text-slate-500">
                · {t.is_contractor ? "Terceiro" : "Próprio"}
                {t.email ? ` · ${t.email}` : ""}
                {t.active ? "" : " · inativo"}
              </span>{" "}
              <Link href={`/app/epi/ficha/${t.id}`} className="text-sm font-normal text-emerald-700 underline">
                Ficha de EPI
              </Link>
            </p>
            <div className="mt-1 text-sm">
              {t.user_id ? (
                <span className="text-emerald-700">Acesso ao Meu EHS ativo</span>
              ) : convite(t.id) ? (
                <span className="flex flex-wrap items-center gap-2 text-amber-700">
                  Convite pendente: peça para {t.full_name.split(" ")[0]} criar a conta em {site}/entrar com {convite(t.id)!.email}
                  <form action={cancelarConvite}>
                    <input type="hidden" name="id" value={convite(t.id)!.id} />
                    <button className="text-xs text-red-600 hover:underline">Cancelar convite</button>
                  </form>
                </span>
              ) : (
                <form action={convidar} className="inline">
                  <input type="hidden" name="id" value={t.id} />
                  <button className="text-emerald-700 hover:underline" disabled={!t.email} title={t.email ? "" : "Cadastre o e-mail primeiro"}>
                    {t.email ? "Convidar para o Meu EHS" : "Sem e-mail: cadastre para convidar"}
                  </button>
                </form>
              )}
            </div>
            <form action={atualizarVinculo} className="mt-2 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto] sm:items-end">
              <input type="hidden" name="id" value={t.id} />
              <label className="text-sm">
                E-mail
                <input name="email" type="email" defaultValue={t.email ?? ""} className="input mt-1" />
              </label>
              <label className="text-sm">
                Setor
                <SelectSetor value={t.sector_id} />
              </label>
              <label className="text-sm">
                Cargo
                <SelectCargo value={t.job_role_id} />
              </label>
              <label className="flex items-center gap-2 text-sm sm:pb-2">
                <input name="ativo" type="checkbox" defaultChecked={t.active} /> Ativo
              </label>
              <button className="btn-ghost">Salvar</button>
            </form>
          </li>
        ))}
        {!trabalhadores?.length && (
          <li className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Nenhum trabalhador cadastrado ainda.
          </li>
        )}
      </ul>
    </div>
  );
}
