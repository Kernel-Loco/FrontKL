import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import "@/i18n/serverLocale";
import { activeLocale } from "@/i18n/tx";
import "./globals.css";
import { localized } from "@/i18n/tx";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = localized({
  title: { default: "LowTide", template: "%s · LowTide" },
  description: "Inteligencia de la superficie de ataque externa: monitoreo OSINT pasivo y score de riesgo.",
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Toda página se arma al pedirla: así Next le pone a sus scripts el nonce de la CSP de proxy.ts (RC-89). Una página
  // estática se arma al compilar, sin nonce, y el navegador no correría sus scripts.
  await connection();
  return (
    <html lang={activeLocale()} className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
