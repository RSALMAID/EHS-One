import Link from "next/link";
import { sair } from "@/app/entrar/actions";
import { ehEquipe, requireOrg } from "@/lib/org";

const ABAS = [
  { href: "/meu", label: "Início" },
  { href: "/meu/acoes", label: "Ações" },
  { href: "/meu/epis", label: "EPIs" },
  { href: "/meu/treinamentos", label: "Treinos" },
  { href: "/meu/saude", label: "Saúde" },
];

export default async function MeuLayout({ children }: { children: React.ReactNode }) {
  const org = await requireOrg();
  const equipe = ehEquipe(org.role);

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-20">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-base font-semibold text-emerald-800">Meu EHS</p>
          <p className="text-xs text-slate-500">{org.name}</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {equipe && <Link href="/app" className="text-emerald-700">Gestão</Link>}
          <form action={sair}>
            <button className="text-slate-600">Sair</button>
          </form>
        </div>
      </header>
      <main className="px-4 py-5">
        {org.workerId ? (
          children
        ) : (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Seu login ainda não está ligado a uma ficha de trabalhador.{" "}
            {equipe
              ? "Em Gestão › Trabalhadores, cadastre seu e-mail na sua ficha e clique em “Convidar para o Meu EHS”; depois saia e entre de novo."
              : "Peça ao responsável de segurança da empresa para conferir o seu e-mail no cadastro."}
          </div>
        )}
      </main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white">
        <ul className="mx-auto grid max-w-lg grid-cols-5 text-center text-xs">
          {ABAS.map((a) => (
            <li key={a.href}>
              <Link href={a.href} className="block py-3 font-medium text-slate-700 active:bg-slate-100">
                {a.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
