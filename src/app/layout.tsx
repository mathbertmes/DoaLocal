import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Cabecalho } from "@/components/cabecalho";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DoaLocal",
  description: "Plataforma comunitária de doações locais de itens em bom estado.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <Cabecalho />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
