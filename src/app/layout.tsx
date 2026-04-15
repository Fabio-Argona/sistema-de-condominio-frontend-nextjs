import { Inter } from 'next/font/google';
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: `Residencial Oceano`,
  description: "Sistema completo para gestão de condomínios. Controle usuários, reservas, ocorrências, pagamentos e muito mais.",
  keywords: "condomínio, gestão, usuários, reservas, pagamentos, síndico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
