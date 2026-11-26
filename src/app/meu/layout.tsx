import Link from "next/link";
import { AbasMeu } from "@/components/AbasMeu";
import { sair } from "@/app/entrar/actions";
import { liberado, modulosLiberados } from "@/lib/modulos";
import { ehEquipe, requireOrg } from "@/lib/org";

const ABAS = [
  { href: "/meu", label: "Início", icone: "inicio" },
  { href: "/meu/relatar", label: "Relatar", icone: "relatar", module: "eventos" },
  { href: "/meu/apr", label: "APR/PT", icone: "tarefa", module: "apr_pt" },
  { href: "/meu/acoes", label: "Ações", icone: "acoes", module: "acoes" },
  { href: "/meu/epis", label: "EPIs", icone: "epi", module: "epi" },
  { href: "/meu/saude", label: "Saúde", icone: "saude", module: "saude" },
];

export default async function MeuLayout({ children }: { children: React.ReactNode }) {
  const org = await requireOrg();
  const equipe = ehEquipe(org.role);
  const modulos = await modulosLiberados(org.id);
  const abas = ABAS.filter((a) => liberado(modulos, a.module)).map(({ href, label, icone }) => ({ href, label, icone }));

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-24">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-xs font-bold text-white">EHS</span>
          <div>
            <p className="text-base font-semibold leading-tight text-slate-900">Meu EHS</p>
            <p className="max-w-48 truncate text-xs text-slate-500">{org.name}</p>
          </div>
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
      <AbasMeu abas={abas} />
    </div>
  );
}
