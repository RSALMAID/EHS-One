import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { adicionarTrabalhador } from "./actions";

export default async function TrabalhadoresPage() {
  const org = await requireOrg();
  const supabase = await createClient();
  const { data: trabalhadores } = await supabase
    .from("workers")
    .select("id, full_name, email, is_contractor, active")
    .eq("organization_id", org.id)
    .order("full_name");

  return (
    <div>
      <h1 className="text-2xl font-bold">Trabalhadores</h1>
      <p className="mt-1 text-sm text-slate-600">
        Cadastre uma vez: o trabalhador aparece em riscos, exames, EPIs e treinamentos. Importação
        por Excel/CSV chega em seguida.
      </p>

      <form action={adicionarTrabalhador} className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[2fr_2fr_auto_auto] sm:items-end">
        <label className="text-sm">
          Nome completo
          <input name="nome" required className="input mt-1" />
        </label>
        <label className="text-sm">
          E-mail (opcional)
          <input name="email" type="email" className="input mt-1" />
        </label>
        <label className="flex items-center gap-2 text-sm sm:pb-2">
          <input name="terceiro" type="checkbox" /> Terceiro
        </label>
        <button className="btn">Adicionar</button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">E-mail</th>
              <th className="px-4 py-2 font-medium">Vínculo</th>
            </tr>
          </thead>
          <tbody>
            {(trabalhadores ?? []).map((t) => (
              <tr key={t.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2">{t.full_name}</td>
                <td className="px-4 py-2 text-slate-600">{t.email ?? "—"}</td>
                <td className="px-4 py-2 text-slate-600">{t.is_contractor ? "Terceiro" : "Próprio"}</td>
              </tr>
            ))}
            {!trabalhadores?.length && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  Nenhum trabalhador cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
