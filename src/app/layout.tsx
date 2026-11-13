import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mesa de Brokers",
  description: "CRM interno de la inmobiliaria.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${GeistSans.variable} ${GeistMono.variable}`} style={{ ["--font-geist" as string]: "var(--font-geist-sans)" }}>
      <body>{children}</body>
    </html>
  );
}
