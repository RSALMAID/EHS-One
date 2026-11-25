import { liberarAcesso } from "./actions";

type Props = { searchParams: Promise<{ erro?: string; next?: string }> };

export default async function AcessoPage({ searchParams }: Props) {
  const { erro, next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <p className="text-lg font-semibold text-emerald-800">EHS One</p>
      <h1 className="mt-6 text-2xl font-bold">Acesso restrito</h1>
      <p className="mt-2 text-sm text-slate-600">
        O EHS One está em fase de testes. Digite o código de acesso para continuar.
      </p>
      {erro && (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">Código incorreto.</p>
      )}
      <form action={liberarAcesso} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next ?? "/"} />
        <label className="block text-sm">
          Código de acesso
          <input
            name="codigo"
            type="password"
            required
            autoFocus
            autoComplete="off"
            className="input mt-1"
          />
        </label>
        <button className="btn w-full">Entrar</button>
      </form>
    </main>
  );
}
