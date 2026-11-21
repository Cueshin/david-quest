import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { notoKr, rubik, russo } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'Давид: Легенда 7-Eleven — С днём рождения!',
  description:
    'Beat ’em up платформер на день рождения Давида: Россия, 경기기계공고, универ и ночная смена в 7-Eleven.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0b0b0c',
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className={`dark ${russo.variable} ${rubik.variable} ${notoKr.variable}`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
