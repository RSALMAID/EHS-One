import Link from "next/link";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default function ConfiguracaoPage() {
  const env = getSupabaseEnv();
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4">
      <h1 className="text-2xl font-bold">
        {env ? "Configuração do Supabase encontrada" : "Falta configurar o Supabase"}
      </h1>
      {env ? (
        <p className="mt-3 text-slate-600">
          O site está ligado a <code className="text-sm">{new URL(env.url).hostname}</code>.{" "}
          <Link href="/entrar" className="text-emerald-700 underline">Ir para o login</Link>
        </p>
      ) : (
        <div className="mt-3 space-y-2 text-slate-600">
          <p>
            Cadastre na Vercel, em Settings → Environment Variables, as variáveis{" "}
            <code className="text-sm">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
            <code className="text-sm">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, e faça um Redeploy.
          </p>
          <p className="text-sm">
            URL recebida: {process.env.NEXT_PUBLIC_SUPABASE_URL ? "sim" : "não"} · chave recebida:{" "}
            {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "sim" : "não"}
          </p>
        </div>
      )}
    </main>
  );
}
