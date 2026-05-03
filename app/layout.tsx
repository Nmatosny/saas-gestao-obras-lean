import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "ANTIGRAVITY | Gestão Inteligente de Obras",
  description: "SaaS de monitoramento e produtividade para construção civil.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className="h-full antialiased"
    >
      <body className="min-h-full flex bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
        <Providers>
          <Sidebar />
          <main className="flex-1 h-screen overflow-y-auto bg-slate-50">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
