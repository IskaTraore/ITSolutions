import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToasterProvider } from "@/components/Toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ITSOLUTIONS - Gestion de hotspots MikroTik",
  description:
    "Plateforme SaaS de gestion centralisée de routeurs MikroTik : Mikhmon en ligne, VPN sécurisé, wallet et abonnements.",
  keywords: ["MikroTik", "Mikhmon", "hotspot", "VPN", "ITSOLUTIONS"],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ToasterProvider>{children}</ToasterProvider>
      </body>
    </html>
  );
}
