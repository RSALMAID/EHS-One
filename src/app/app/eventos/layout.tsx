import { requireModule } from "@/lib/modulos";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireModule("eventos");
  return children;
}
