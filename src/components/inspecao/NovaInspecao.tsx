import { iniciarInspecao } from "@/app/app/inspecoes/actions";
import { hoje } from "@/lib/datas";

type Opcao = { id: string; label: string };

export function NovaInspecao({
  modelos,
  setores,
  voltar,
  inspetor,
  empresa,
}: {
  modelos: { id: string; name: string; equipment?: string | null }[];
  setores: Opcao[];
  voltar: string;
  inspetor?: string;
  empresa?: string;
}) {
  const agora = new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  return (
    <form action={iniciarInspecao} className="grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-2">
      <input type="hidden" name="voltar" value={voltar} />
      <label>
        Checklist
        <select name="modelo" required className="input mt-1" defaultValue="">
          <option value="">— escolha —</option>
          {modelos.map((m) => (
            <option key={m.id} value={m.id}>{m.name}{m.equipment ? " (equipamento)" : ""}</option>
          ))}
        </select>
      </label>
      <label>
        TAG do equipamento
        <input name="tag" className="input mt-1" placeholder="Ex.: PR-OFC-001 (obrigatória em checklist de equipamento)" />
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
      <div className="grid grid-cols-2 gap-3">
        <label>
          Data
          <input name="data" type="date" required defaultValue={hoje()} className="input mt-1" />
        </label>
        <label>
          Hora
          <input name="hora" type="time" required defaultValue={agora} className="input mt-1" />
        </label>
      </div>
      <label>
        Inspetor
        <input name="inspetor" required defaultValue={inspetor} className="input mt-1" />
      </label>
      <label>
        Matrícula ou documento do inspetor
        <input name="documento" className="input mt-1" />
      </label>
      <label>
        Empresa
        <input name="empresa" defaultValue={empresa} className="input mt-1" />
      </label>
      <div className="sm:col-span-2">
        <button className="btn">Iniciar inspeção</button>
      </div>
    </form>
  );
}
