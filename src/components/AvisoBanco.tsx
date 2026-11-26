type ErroBanco = { code?: string; message?: string } | null | undefined;

/** Tabela ou função que ainda não existe no banco: falta rodar o script da migração. */
export function faltaScript(...erros: ErroBanco[]) {
  return erros.some(
    (e) =>
      e &&
      (e.code === "PGRST205" ||
        e.code === "PGRST202" ||
        e.code === "42P01" ||
        e.code === "42883" ||
        /does not exist|could not find the (table|function)/i.test(e.message ?? "")),
  );
}

/**
 * Aviso amigável quando a tela não consegue ler o banco. Se a tabela não existe,
 * diz qual script falta rodar no Supabase; nos outros casos, pede para tentar de novo.
 */
export function AvisoBanco({ erros, script }: { erros: ErroBanco[]; script: string }) {
  if (!erros.some(Boolean)) return null;
  return (
    <div role="alert" className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      {faltaScript(...erros) ? (
        <>
          <p className="font-medium">Esta tela ainda não está pronta no banco.</p>
          <p className="mt-1">
            Falta rodar o script <code className="font-mono">{script}</code> no Supabase (SQL Editor). Depois, recarregue
            a página.
          </p>
        </>
      ) : (
        <p>Não foi possível carregar os dados agora. Recarregue a página; se continuar, avise o suporte.</p>
      )}
    </div>
  );
}
