import { somarMeses } from "./datas";

export const CARGOS_CIPA: Record<string, string> = {
  presidente: "Presidente",
  vice_presidente: "Vice-presidente",
  secretario: "Secretário(a)",
  titular: "Titular",
  suplente: "Suplente",
};

export const REPRESENTACAO: Record<string, string> = {
  empregador: "Indicado pelo empregador",
  empregados: "Eleito pelos empregados",
};

export const TIPOS_REUNIAO: Record<string, string> = {
  ordinaria: "Ordinária",
  extraordinaria: "Extraordinária",
};

export const CARGOS_SESMT: Record<string, string> = {
  engenheiro_seguranca: "Engenheiro(a) de segurança do trabalho",
  tecnico_seguranca: "Técnico(a) de segurança do trabalho",
  medico_trabalho: "Médico(a) do trabalho",
  enfermeiro_trabalho: "Enfermeiro(a) do trabalho",
  auxiliar_enfermagem: "Auxiliar/técnico(a) de enfermagem do trabalho",
};

/**
 * Estabilidade (NR-05 e ADCT art. 10): o representante eleito pelos empregados,
 * titular ou suplente, não pode ser dispensado sem justa causa até 1 ano após o fim do mandato.
 */
export function estabilidadeAte(representacao: string, fimMandato: string): string | null {
  return representacao === "empregados" ? somarMeses(fimMandato, 12) : null;
}
