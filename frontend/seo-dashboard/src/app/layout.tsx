import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-stack',
  display: 'swap',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'OpenClaw SEO',
  description: 'AI-powered SEO automation command center',
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><defs><linearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%236366F1'/><stop offset='100%25' stop-color='%234F46E5'/></linearGradient></defs><circle cx='16' cy='16' r='15' fill='%2309090B' stroke='url(%23g)' stroke-width='2'/><path d='M10 22 L16 10 L22 22 M12.5 17 L19.5 17' stroke='url(%23g)' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/></svg>",
        type: 'image/svg+xml',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased font-sans`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
