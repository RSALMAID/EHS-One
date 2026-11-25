import { AprDetalhe } from "@/components/apr/AprDetalhe";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> };

export default async function Page({ params, searchParams }: Props) {
  const [{ id }, { erro }] = await Promise.all([params, searchParams]);
  return <AprDetalhe id={id} base="/app" erro={erro} />;
}
