import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    default:  'منصة التراث السوداني | Sudanese Heritage Platform',
    template: '%s | منصة التراث السوداني',
  },
  description:
    'اكتشف جذورك وتواصل مع عائلتك وحافظ على تراثك السوداني — Discover your roots, connect with family, and preserve Sudanese cultural heritage.',
  keywords: [
    'Sudanese heritage', 'family tree', 'genealogy', 'Sudan', 'تراث سوداني',
    'شجرة العائلة', 'أنساب', 'قبائل سودانية', 'diaspora', 'oral history',
  ],
  authors: [{ name: 'Sudanese Heritage Platform' }],
  openGraph: {
    type:   'website',
    locale: 'ar_SD',
    alternateLocale: 'en_US',
    siteName: 'Sudanese Heritage Platform',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  themeColor:   '#d4922d',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Amiri:wght@400;700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} font-arabic antialiased`}>
        <Providers>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              className: 'font-arabic',
              duration: 4000,
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
