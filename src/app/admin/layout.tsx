import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Área da equipe EHS One: só para administradores da plataforma. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: admin } = await supabase.rpc("is_platform_admin");
  if (!admin) notFound();
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">EHS</span>
          <p className="font-semibold text-slate-900">Equipe EHS One</p>
        </div>
        <Link href="/app" className="text-sm text-emerald-700 hover:underline">Voltar à Gestão</Link>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8">{children}</main>
    </div>
  );
}
