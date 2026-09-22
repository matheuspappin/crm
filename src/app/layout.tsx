import type { Metadata } from 'next'
import { Sora } from 'next/font/google'
import './globals.css'

const _sora = Sora({ subsets: ["latin"], variable: "--font-sora" });

export const metadata: Metadata = {
  title: 'AKAAI CRM | Agência de Marketing',
  description: 'CRM e ERP centralizado para agência — Kanban, tráfego, entregas técnicas e visão executiva em tempo real.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`min-h-screen bg-background text-foreground antialiased ${_sora.variable}`}>
        {children}
      </body>
    </html>
  )
}
