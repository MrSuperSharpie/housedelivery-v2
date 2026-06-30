import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth'
import { StoreProvider } from '@/lib/store'
import { ThemeProvider } from '@/lib/theme'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Vero — Construction Inspection Platform',
    template: '%s | Vero',
  },
  description:
    'Vero Permit helps builders and inspectors keep inspection records, photos, notes, deficiencies, reports, and project history organized in one secure project file, supporting private building inspections in BC.',
  keywords: ['construction inspection', 'BC Schedule C-B', 'building inspection', 'private inspector', 'Vancouver'],
  openGraph: {
    title: 'Vero',
    description: 'Stop paying your crew to stand still. Get inspections in hours, not days.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#FF5F15" />
        <link rel="icon" href="/vero-permit-dark.png" type="image/png" />
      </head>
      <body className="min-h-screen bg-surface font-sans text-ink transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>
            <StoreProvider>
              {children}
            </StoreProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
