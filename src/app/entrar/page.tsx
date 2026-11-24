import Link from "next/link";
import { cadastrar, entrar } from "./actions";

type Props = {
  searchParams: Promise<{ modo?: string; erro?: string; aviso?: string; next?: string }>;
};

export default async function EntrarPage({ searchParams }: Props) {
  const { modo, erro, aviso, next } = await searchParams;
  const cadastro = modo === "cadastro";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <Link href="/" className="text-lg font-semibold text-emerald-800">
        EHS One
      </Link>
      <h1 className="mt-6 text-2xl font-bold">{cadastro ? "Criar conta" : "Entrar"}</h1>

      {erro && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
      {aviso && (
        <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{aviso}</p>
      )}

      <form action={cadastro ? cadastrar : entrar} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <label className="block text-sm">
          E-mail
          <input name="email" type="email" required autoComplete="email" className="input mt-1" />
        </label>
        <label className="block text-sm">
          Senha
          <input
            name="senha"
            type="password"
            required
            minLength={8}
            autoComplete={cadastro ? "new-password" : "current-password"}
            className="input mt-1"
          />
        </label>
        <button className="btn w-full">{cadastro ? "Criar conta grátis" : "Entrar"}</button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        {cadastro ? (
          <>
            Já tem conta? <Link href="/entrar" className="text-emerald-700 underline">Entrar</Link>
          </>
        ) : (
          <>
            Novo por aqui?{" "}
            <Link href="/entrar?modo=cadastro" className="text-emerald-700 underline">
              Criar conta grátis
            </Link>
          </>
        )}
      </p>
      <p className="mt-2 text-xs text-slate-400">Login com Google e Microsoft chega em seguida.</p>
    </main>
  );
}
