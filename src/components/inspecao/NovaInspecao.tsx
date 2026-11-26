import { iniciarInspecao } from "@/app/app/inspecoes/actions";
import { hoje } from "@/lib/datas";

type Opcao = { id: string; label: string };

export function NovaInspecao({
  modelos,
  setores,
  voltar,
  inspetor,
}: {
  modelos: { id: string; name: string }[];
  setores: Opcao[];
  voltar: string;
  inspetor?: string;
}) {
  return (
    <form action={iniciarInspecao} className="grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-2">
      <input type="hidden" name="voltar" value={voltar} />
      <label>
        Checklist
        <select name="modelo" required className="input mt-1" defaultValue="">
          <option value="">— escolha —</option>
          {modelos.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </label>
      <label>
        Setor (opcional)
        <select name="setor" className="input mt-1" defaultValue="">
          <option value="">—</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>
      <label>
        Local exato (opcional)
        <input name="local" className="input mt-1" placeholder="Ex.: doca 3" />
      </label>
      <label>
        Data
        <input name="data" type="date" defaultValue={hoje()} className="input mt-1" />
      </label>
      <label className="sm:col-span-2">
        Inspetor
        <input name="inspetor" defaultValue={inspetor} className="input mt-1" />
      </label>
      <div className="sm:col-span-2">
        <button className="btn">Iniciar inspeção</button>
      </div>
    </form>
  );
}
