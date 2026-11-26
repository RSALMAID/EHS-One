"use client";

import { TelaErro } from "@/components/TelaErro";

export default function Erro(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <TelaErro {...props} />;
}
