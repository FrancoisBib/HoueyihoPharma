import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nouvelle Pharmacie Houeyiho - Recherche de Médicaments",
  description: "Application de recherche de médicaments au Benin. Comparez les prix entre pharmacies partenaires.",
  keywords: ["pharmacie", "médicament", "Benin", "prix", "santé"],
  authors: [{ name: "Brice Yedemon" }],
  icons: {
    icon: "/houeyiho.png",
  },
  openGraph: {
    title: "Houeyiho",
    description: "Recherche de médicaments au Benin",
    url: "https://houeyihopharma.com/",
    siteName: "HoueyihoPharma",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nouvelle Pharmacie Houeyiho",
    description: "Recherche de médicaments au Benin",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
