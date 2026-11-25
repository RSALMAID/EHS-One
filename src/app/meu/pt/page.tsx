import { redirect } from "next/navigation";

export default async function Page({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  redirect(erro ? `/meu/apr?erro=${encodeURIComponent(erro)}` : "/meu/apr");
}
