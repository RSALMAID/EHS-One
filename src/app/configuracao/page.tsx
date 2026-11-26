import Link from "next/link";
import { checkSupabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default function ConfiguracaoPage() {
  const check = checkSupabaseEnv();
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4">
      <h1 className="titulo">
        {check.ok ? "Supabase configurado" : "A configuração do Supabase tem um problema"}
      </h1>
      {check.ok ? (
        <p className="mt-3 text-slate-600">
          O site está ligado a <code className="text-sm">{new URL(check.url).hostname}</code>.{" "}
          <Link href="/entrar?modo=cadastro" className="text-emerald-700 underline">
            Criar conta
          </Link>
        </p>
      ) : (
        <div className="mt-3 space-y-3 text-slate-600">
          <ul className="list-disc space-y-1 pl-5 text-red-700">
            {check.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <div className="rounded-md bg-white p-3 text-sm">
            <p>
              URL recebida: <code>{check.rawUrl || "(vazia)"}</code>
            </p>
            <p>
              Chave recebida: <code>{check.keyPreview}</code>
            </p>
          </div>
          <p className="text-sm">
            Corrija na Vercel em Settings → Environment Variables e faça um Redeploy.
          </p>
        </div>
      )}
    </main>
  );
}
