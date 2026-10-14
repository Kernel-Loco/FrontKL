import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono-lt",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Lowtide", template: "%s · Lowtide" },
  description: "Inteligencia de la superficie de ataque externa: monitoreo OSINT pasivo y score de riesgo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
