import Link from "next/link";
import { Erro } from "@/components/Erro";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { adicionarTrabalhador, atualizarVinculo } from "./actions";

type Props = { searchParams: Promise<{ erro?: string }> };

export default async function TrabalhadoresPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: trabalhadores }, { data: setores }, { data: unidades }, { data: cargos }] = await Promise.all([
    supabase
      .from("workers")
      .select("id, full_name, email, is_contractor, active, sector_id, job_role_id")
      .eq("organization_id", org.id)
      .order("active", { ascending: false })
      .order("full_name"),
    supabase.from("sectors").select("id, name, unit_id").eq("organization_id", org.id).order("name"),
    supabase.from("units").select("id, name").eq("organization_id", org.id),
    supabase.from("job_roles").select("id, name").eq("organization_id", org.id).order("name"),
  ]);
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
      <h1 className="text-2xl font-bold">Trabalhadores</h1>
      <p className="mt-1 text-sm text-slate-600">
        O vínculo trabalhador → cargo → setor é o que liga cada pessoa aos riscos, exames, EPIs e
        treinamentos. Importação por Excel/CSV chega em seguida.
      </p>
      <Erro mensagem={erro} />

      <form action={adicionarTrabalhador} className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <li key={t.id} className={`rounded-lg border border-slate-200 bg-white p-4 ${t.active ? "" : "opacity-60"}`}>
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
            <form action={atualizarVinculo} className="mt-2 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
              <input type="hidden" name="id" value={t.id} />
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
