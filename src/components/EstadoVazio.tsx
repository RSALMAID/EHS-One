import type { LucideIcon } from "lucide-react";
import Link from "next/link";

type Props = { icone: LucideIcon; titulo: string; texto?: string; acao?: { texto: string; href: string } };

function Conteudo({ icone: Icone, titulo, texto, acao }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Icone className="size-5" aria-hidden />
      </span>
      <p className="font-medium text-slate-800">{titulo}</p>
      {texto && <p className="max-w-md text-sm text-slate-500">{texto}</p>}
      {acao && (
        <Link href={acao.href} className="btn mt-1">
          {acao.texto}
        </Link>
      )}
    </div>
  );
}

/** Lista vazia: diz o que a tela guarda e qual é o primeiro passo. Use dentro de <ul>. */
export function VazioLista(props: Props) {
  return (
    <li>
      <Conteudo {...props} />
    </li>
  );
}

/** Mesma coisa para tabelas: ocupa a linha inteira. */
export function VazioTabela({ colunas, ...props }: Props & { colunas: number }) {
  return (
    <tr>
      <td colSpan={colunas}>
        <Conteudo {...props} />
      </td>
    </tr>
  );
}
