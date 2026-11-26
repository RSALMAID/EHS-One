import Link from "next/link";

const MODULOS = [
  ["GRO/PGR", "Inventário de riscos e plano de ação gerados a partir do que você cadastra."],
  ["Central de Ações", "Toda pendência com dono, prazo e evidência, numa fila só."],
  ["EPI e treinamentos", "Entregas, CA, vencimentos e matriz por cargo e risco."],
  ["Saúde ocupacional", "ASO e exames ligados ao risco de cada trabalhador."],
  ["Inspeções", "Checklist no celular: resposta Não abre um desvio sozinho."],
  ["Painel", "Oito indicadores e um número: sua empresa está sob controle?"],
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:py-20">
      <header className="flex items-center justify-between">
        <span className="text-lg font-semibold text-emerald-800">EHS One</span>
        <Link href="/entrar" className="btn-ghost">
          Entrar
        </Link>
      </header>

      <section className="mt-16 max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          SST no piloto automático para pequenas empresas.
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Responda algumas perguntas sobre sua operação e o EHS One monta seu PGR, sua agenda de
          exames e treinamentos e suas pendências. Sem precisar aprender um sistema complexo.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/entrar?modo=cadastro" className="btn">
            Criar conta grátis
          </Link>
          <span className="self-center text-sm text-slate-500">14 dias grátis, sem cartão</span>
        </div>
      </section>

      <section className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULOS.map(([titulo, texto]) => (
          <div key={titulo} className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <h2 className="font-semibold">{titulo}</h2>
            <p className="mt-1 text-sm text-slate-600">{texto}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
