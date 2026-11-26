"use client";

import { useEffect } from "react";

/**
 * Mostrada no lugar de uma tela que falhou, em vez da página em branco.
 * "Recarregar" também resolve o caso comum de o site ter sido atualizado enquanto a aba estava aberta.
 */
export function TelaErro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div role="alert" className="mx-auto my-10 max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      <p className="text-base font-semibold">Não foi possível abrir esta tela.</p>
      <p className="mt-2">
        Recarregue a página. Isso costuma resolver, principalmente logo depois de uma atualização do sistema. Seus dados
        estão guardados.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          Recarregar a página
        </button>
        <button type="button" className="btn-ghost" onClick={() => reset()}>
          Tentar de novo
        </button>
      </div>
      {error.digest && <p className="mt-3 text-xs text-amber-700">Código do erro: {error.digest}</p>}
    </div>
  );
}
