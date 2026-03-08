import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ErrorBoundary } from '@/components/error-boundary'
import { TopNav } from '@/components/top-nav'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F172A',
}

export const metadata: Metadata = {
  title: 'CookQuest - Learn Cooking Skills Gamified',
  description: 'Master cooking skills through interactive recipes and gamified learning.',
  keywords: ['cooking', 'recipes', 'learning', 'skills', 'gamification'],
  authors: [{ name: 'CookQuest Team' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://cookquest.app'),
  openGraph: {
    title: 'CookQuest - Learn Cooking Skills',
    description: 'Master cooking skills through interactive recipes and gamified learning.',
    type: 'website',
    images: ['/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CookQuest - Learn Cooking Skills',
    description: 'Master cooking skills through interactive recipes and gamified learning.',
  },
  robots: 'index, follow',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CookQuest',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <ErrorBoundary>
            <div className="min-h-screen bg-cq-bg">
              <TopNav />
              <main className="container mx-auto px-4 py-6">
                {children}
              </main>
            </div>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  )
}