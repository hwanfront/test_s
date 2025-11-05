import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { AppErrorBoundary } from '@/shared/ui/error-boundary'
import { GlobalErrorHandler } from './global-error-handler'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Terms Watcher',
  description: 'AI-powered terms and conditions analysis to protect user rights',
  keywords: [
    'terms and conditions',
    'legal analysis',
    'AI analysis',
    'user protection',
    'mobile gaming',
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GlobalErrorHandler />
        <AppErrorBoundary>
          <Providers>
            <div className="min-h-screen bg-white font-sans antialiased">
              <div className="relative flex min-h-screen flex-col">
                <main className="flex-1">{children}</main>
              </div>
            </div>
          </Providers>
        </AppErrorBoundary>
      </body>
    </html>
  )
}