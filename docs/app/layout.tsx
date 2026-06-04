import type { Metadata } from 'next';
import { Onest, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import CommandPalette from '@/components/CommandPalette';
import BackToTop from '@/components/BackToTop';
import { BFCacheHandler } from '@/components/BFCacheHandler';
import './globals.css';

const onest = Onest({
  subsets: ['latin'],
  variable: '--font-onest',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'stackr — Production-grade full-stack monorepos that stay on-convention',
    template: '%s | stackr',
  },
  description:
    'stackr scaffolds a multi-service TypeScript monorepo — isolated Fastify services, BetterAuth, Drizzle/Prisma, Docker — and ships a push-based context harness that keeps AI agents on-convention long after generation.',
  keywords: [
    'TypeScript monorepo',
    'microservices',
    'Fastify',
    'BetterAuth',
    'Drizzle',
    'Prisma',
    'Next.js',
    'Expo',
    'Docker',
    'AI agents',
    'agentic coding',
    'CLI',
    'scaffolding',
  ],
  authors: [{ name: 'itharea' }],
  creator: 'itharea',
  metadataBase: new URL('https://stackr.sh'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://stackr.sh',
    title: 'stackr — Production-grade full-stack monorepos that stay on-convention',
    description:
      'A multi-service TypeScript monorepo generator with a built-in context harness that keeps the architecture and conventions intact — even under AI editing.',
    siteName: 'stackr',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'stackr',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'stackr — Production-grade full-stack monorepos that stay on-convention',
    description:
      'A multi-service TypeScript monorepo generator with a built-in context harness that keeps the architecture and conventions intact — even under AI editing.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Satoshi font from Fontshare */}
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@500,700,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${onest.variable} ${jetbrainsMono.variable}`}>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <BFCacheHandler>
            <Navigation />
            <CommandPalette />
            {children}
            <Footer />
            <BackToTop />
          </BFCacheHandler>
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
