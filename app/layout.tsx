import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ConsoleProvider } from '@/lib/store'
import './globals.css'

/** Whop's dashboard runs on Inter. So does this. */
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Range — Agent Console',
  description: 'The approval gate for an agent-run business on Whop.',
}

export const viewport: Viewport = {
  themeColor: '#111111',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh bg-ground text-ink antialiased">
        <ConsoleProvider>{children}</ConsoleProvider>
      </body>
    </html>
  )
}
