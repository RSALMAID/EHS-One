import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EHS One",
  description: "Gestão de Saúde, Segurança e Meio Ambiente para pequenas empresas.",
  appleWebApp: { capable: true, title: "Meu EHS", statusBarStyle: "default" },
  icons: { apple: "/icone/192" },
};

export const viewport: Viewport = { themeColor: "#047857" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.variable} antialiased`}>{children}</body>
    </html>
  );
}
