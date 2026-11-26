import { relatarEvento } from "@/app/app/eventos/actions";

type Opcao = { id: string; label: string };

/** Formulário de relato, usado na Gestão e no Meu EHS. */
export function FormRelato({
  tipos,
  setores,
  voltar,
  celular,
}: {
  tipos: [string, string][];
  setores: Opcao[];
  voltar: string;
  celular?: boolean;
}) {
  const agora = new Date().toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).slice(0, 16).replace(" ", "T");
  return (
    <form action={relatarEvento} className={`grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm ${celular ? "" : "sm:grid-cols-2"}`}>
      <input type="hidden" name="voltar" value={voltar} />
      <label className={celular ? "" : "sm:col-span-2"}>
        O que foi
        <select name="tipo" required className="input mt-1">
          {tipos.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </label>
      <label>
        Quando
        <input name="quando" type="datetime-local" defaultValue={agora} className="input mt-1" />
      </label>
      <label>
        Setor
        <select name="setor" className="input mt-1">
          <option value="">—</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>
      <label className={celular ? "" : "sm:col-span-2"}>
        Local exato (opcional)
        <input name="local" className="input mt-1" placeholder="Corredor do almoxarifado, prateleira 3" />
      </label>
      <label className={celular ? "" : "sm:col-span-2"}>
        O que aconteceu
        <textarea name="descricao" required rows={3} className="input mt-1" />
      </label>
      <label className={celular ? "" : "sm:col-span-2"}>
        O que já foi feito na hora (opcional)
        <input name="imediata" className="input mt-1" placeholder="Área isolada, chefe avisado" />
      </label>
      <label className={celular ? "" : "sm:col-span-2"}>
        Fotos (opcional)
        <input name="fotos" type="file" accept="image/*" multiple className="mt-1 block text-xs" />
      </label>
      {celular && (
        <label className="flex items-center gap-2">
          <input type="checkbox" name="ocultar" /> Não mostrar meu nome para a gestão
        </label>
      )}
      <div className={celular ? "" : "sm:col-span-2"}>
        <button className={`btn ${celular ? "w-full py-3" : ""}`}>Enviar relato</button>
      </div>
    </form>
  );
}
