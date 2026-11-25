import { InspecaoDetalhe } from "@/components/inspecao/InspecaoDetalhe";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ok?: string }> };

export default async function Page({ params, searchParams }: Props) {
  const [{ id }, { erro, ok }] = await Promise.all([params, searchParams]);
  return <InspecaoDetalhe id={id} base="/app" erro={erro} ok={ok} />;
}
