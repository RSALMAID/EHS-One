import { CATEGORIAS_DOC } from "@/lib/dds";

type Doc = {
  title?: string;
  category?: string;
  sector_id?: string | null;
  version?: string | null;
  issued_on?: string | null;
  valid_until?: string | null;
  responsible?: string | null;
  notes?: string | null;
  visible_to_workers?: boolean;
  file_name?: string | null;
};

/** Campos do documento, usados para cadastrar e para editar. */
export function CamposDocumento({ doc = {}, setores }: { doc?: Doc; setores: { id: string; label: string }[] }) {
  return (
    <>
      <label className="sm:col-span-2">
        Nome
        <input name="titulo" required defaultValue={doc.title} className="input mt-1" placeholder="Ex.: PGR 2026, LTCAT, AVCB" />
      </label>
      <label>
        Tipo
        <select name="categoria" defaultValue={doc.category ?? "outro"} className="input mt-1">
          {Object.entries(CATEGORIAS_DOC).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        Setor (opcional)
        <select name="setor" defaultValue={doc.sector_id ?? ""} className="input mt-1">
          <option value="">Empresa toda</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>
      <label>
        Versão / revisão
        <input name="versao" defaultValue={doc.version ?? ""} className="input mt-1" />
      </label>
      <label>
        Responsável
        <input name="responsavel" defaultValue={doc.responsible ?? ""} className="input mt-1" />
      </label>
      <label>
        Emitido em
        <input name="emissao" type="date" defaultValue={doc.issued_on ?? ""} className="input mt-1" />
      </label>
      <label>
        Válido até
        <input name="validade" type="date" defaultValue={doc.valid_until ?? ""} className="input mt-1" />
      </label>
      <label className="sm:col-span-2">
        {doc.file_name ? `Trocar arquivo (atual: ${doc.file_name})` : "Arquivo (PDF, imagem…)"}
        <input name="arquivo" type="file" className="mt-1 block w-full text-sm" />
      </label>
      <label className="sm:col-span-2">
        Observações
        <textarea name="obs" rows={2} defaultValue={doc.notes ?? ""} className="input mt-1" />
      </label>
      <label className="flex items-center gap-2 sm:col-span-2">
        <input type="checkbox" name="visivel" defaultChecked={doc.visible_to_workers} /> Trabalhadores podem ver no Meu EHS
      </label>
    </>
  );
}
