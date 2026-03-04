import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import './globals.css'
import { Providers } from './providers'
import Script from 'next/script' // <-- GA import

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
  themeColor:   '#B87A3B',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning suppressContentEditableWarning>
      <head>
        {/* Google Analytics 4 */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-1MDXYEMBTF"
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-1MDXYEMBTF', {
              page_path: window.location.pathname,
            });
          `}
        </Script>

        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-arabic antialiased">
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