import { criarApr, criarPt } from "@/app/app/apr/actions";
import { numeroApr, TIPOS_PT } from "@/lib/apr";
import { hoje } from "@/lib/datas";

type Opcao = { id: string; label: string };

export function NovaApr({ setores, voltar }: { setores: Opcao[]; voltar: string }) {
  return (
    <form action={criarApr} className="grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-2">
      <input type="hidden" name="voltar" value={voltar} />
      <label className="sm:col-span-2">
        Tarefa
        <input name="titulo" required className="input mt-1" placeholder="Ex.: troca de telhas do galpão 2" />
      </label>
      <label>
        Setor
        <select name="setor" className="input mt-1" defaultValue="">
          <option value="">—</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>
      <label>
        Data prevista
        <input name="data" type="date" defaultValue={hoje()} className="input mt-1" />
      </label>
      <label className="sm:col-span-2">
        Local exato (opcional)
        <input name="local" className="input mt-1" />
      </label>
      <label className="sm:col-span-2">
        Descrição (opcional)
        <textarea name="descricao" rows={2} className="input mt-1" />
      </label>
      <div className="sm:col-span-2">
        <button className="btn">Criar APR e incluir as etapas</button>
      </div>
    </form>
  );
}

export function NovaPt({
  setores,
  aprs,
  voltar,
}: {
  setores: Opcao[];
  aprs: { id: string; number: number; title: string }[];
  voltar: string;
}) {
  return (
    <form action={criarPt} className="grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm sm:grid-cols-2">
      <input type="hidden" name="voltar" value={voltar} />
      <label>
        Tipo de serviço
        <select name="tipo" required className="input mt-1" defaultValue="">
          <option value="">— escolha —</option>
          {Object.entries(TIPOS_PT).map(([k, t]) => (
            <option key={k} value={k}>{t.nome}{t.nr ? ` (${t.nr})` : ""}</option>
          ))}
        </select>
      </label>
      <label>
        APR aprovada (opcional)
        <select name="apr" className="input mt-1" defaultValue="">
          <option value="">—</option>
          {aprs.map((a) => (
            <option key={a.id} value={a.id}>{numeroApr(a.number)} · {a.title}</option>
          ))}
        </select>
      </label>
      <label className="sm:col-span-2">
        Serviço
        <input name="descricao" required className="input mt-1" placeholder="Ex.: solda na tubulação da caldeira" />
      </label>
      <label>
        Setor
        <select name="setor" className="input mt-1" defaultValue="">
          <option value="">—</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>
      <label>
        Local exato
        <input name="local" className="input mt-1" />
      </label>
      <label>
        Início
        <input name="inicio" type="datetime-local" required className="input mt-1" />
      </label>
      <label>
        Fim
        <input name="fim" type="datetime-local" required className="input mt-1" />
      </label>
      <p className="text-xs text-slate-500 sm:col-span-2">O checklist do tipo escolhido é criado automaticamente.</p>
      <div className="sm:col-span-2">
        <button className="btn">Solicitar PT</button>
      </div>
    </form>
  );
}
