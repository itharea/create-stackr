import type { Metadata } from 'next';
import { Onest, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import CommandPalette from '@/components/CommandPalette';
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
    default: 'create-stackr - Generate Production-Ready Mobile Apps',
    template: '%s | create-stackr',
  },
  description:
    'Generate production-ready mobile applications with React Native, Expo, and Node.js backend. Built-in integrations, authentication, and more.',
  keywords: [
    'React Native',
    'Expo',
    'Node.js',
    'Full-Stack',
    'Mobile Development',
    'CLI',
    'Boilerplate',
  ],
  authors: [{ name: 'itharea' }],
  creator: 'itharea',
  metadataBase: new URL('https://stackr.sh'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://stackr.sh',
    title: 'create-stackr Documentation',
    description:
      'Complete documentation for create-stackr - the fastest way to build production-ready mobile apps.',
    siteName: 'create-stackr',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'create-stackr',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'create-stackr Documentation',
    description:
      'Complete documentation for create-stackr - the fastest way to build production-ready mobile apps.',
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
          </BFCacheHandler>
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
