"use client";

import "./globals.css";

/** Último recurso: falha no próprio esqueleto do site. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans">
        <div role="alert" className="max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="text-base font-semibold">Não foi possível abrir o EHS One agora.</p>
          <p className="mt-2">Recarregue a página. Seus dados estão guardados.</p>
          <button type="button" className="btn mt-4" onClick={() => window.location.reload()}>
            Recarregar a página
          </button>
          {error.digest && <p className="mt-3 text-xs text-amber-700">Código do erro: {error.digest}</p>}
        </div>
      </body>
    </html>
  );
}
