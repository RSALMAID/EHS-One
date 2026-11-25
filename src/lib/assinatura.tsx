type Entrega = { signature_name: string | null; confirmed_at?: string | null };

/** Como a entrega de EPI foi assinada: nome digitado na hora, confirmação no celular ou pendente. */
export function Assinatura({ e }: { e: Entrega }) {
  if (e.confirmed_at) {
    return (
      <span className="text-emerald-700">
        confirmado no Meu EHS em {new Date(e.confirmed_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
      </span>
    );
  }
  if (e.signature_name) return <span>assinado: {e.signature_name}</span>;
  return <span className="text-amber-700">aguardando confirmação no celular</span>;
}
