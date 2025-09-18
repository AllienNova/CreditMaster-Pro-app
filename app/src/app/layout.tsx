import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CreditMaster Pro - AI-Powered Credit Repair',
  description: 'Professional credit repair platform with 28 advanced strategies, AI analysis, and automated dispute management. Improve your credit score with proven results.',
  keywords: 'credit repair, credit score improvement, AI credit analysis, dispute management, FCRA compliant',
  authors: [{ name: 'CreditMaster Pro Team' }],
  openGraph: {
    title: 'CreditMaster Pro - AI-Powered Credit Repair',
    description: 'Professional credit repair platform with 28 advanced strategies and AI analysis',
    url: 'https://app.creditmaster.pro',
    siteName: 'CreditMaster Pro',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CreditMaster Pro - AI-Powered Credit Repair',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CreditMaster Pro - AI-Powered Credit Repair',
    description: 'Professional credit repair platform with 28 advanced strategies and AI analysis',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div id="root">{children}</div>
      </body>
    </html>
  )
}

