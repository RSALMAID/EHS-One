import { requireModule } from "@/lib/modulos";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireModule("pgr");
  return children;
}
