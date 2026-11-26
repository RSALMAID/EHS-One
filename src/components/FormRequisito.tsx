import { AREAS_LEGAIS, ESFERAS } from "@/lib/requisitos";

type Opcao = { id: string; label: string };
type Valores = {
  area?: string;
  sphere?: string;
  source?: string;
  title?: string;
  requirement?: string | null;
  sector_id?: string | null;
  responsible_id?: string | null;
  review_months?: number;
  notes?: string | null;
};

/** Campos do requisito legal, usados para criar e para editar. */
export function CamposRequisito({ v = {}, setores, pessoas }: { v?: Valores; setores: Opcao[]; pessoas: Opcao[] }) {
  return (
    <>
      <label>
        Área
        <select name="area" required className="input mt-1" defaultValue={v.area ?? ""}>
          <option value="" disabled>Escolha…</option>
          {Object.entries(AREAS_LEGAIS).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
      </label>
      <label>
        Esfera
        <select name="esfera" className="input mt-1" defaultValue={v.sphere ?? "federal"}>
          {Object.entries(ESFERAS).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
      </label>
      <label>
        Fonte (lei, norma, licença)
        <input name="fonte" required defaultValue={v.source ?? ""} className="input mt-1" placeholder="Ex.: NR-35, Lei 12.305/2010, LO nº…" />
      </label>
      <label>
        Título
        <input name="titulo" required defaultValue={v.title ?? ""} className="input mt-1" />
      </label>
      <label className="sm:col-span-2">
        O que a empresa precisa cumprir
        <textarea name="requisito" rows={2} defaultValue={v.requirement ?? ""} className="input mt-1" />
      </label>
      <label>
        Setor (se for de um setor só)
        <select name="setor" className="input mt-1" defaultValue={v.sector_id ?? ""}>
          <option value="">Toda a empresa</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>
      <label>
        Responsável
        <select name="responsavel" className="input mt-1" defaultValue={v.responsible_id ?? ""}>
          <option value="">—</option>
          {pessoas.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </label>
      <label>
        Reavaliar a cada (meses)
        <input name="periodicidade" type="number" min={1} max={60} defaultValue={v.review_months ?? 12} className="input mt-1" />
      </label>
      <label>
        Observações
        <input name="obs" defaultValue={v.notes ?? ""} className="input mt-1" />
      </label>
    </>
  );
}
