import './globals.css';
import type { Metadata, Viewport } from 'next';
import { siteConfig } from '@/lib/site';
import { cn } from '@/lib/utils';
import { SwRegister } from '@/components/sw-register';

export const metadata: Metadata = {
  applicationName: siteConfig.name,
  title: {
    default: `${siteConfig.name} — Presentation coach for work`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    'presentation skills',
    'public speaking practice',
    'present at work',
    'pitch practice',
    'executive presence',
    'speaking coach',
    'communication training',
  ],
  manifest: '/manifest.webmanifest',
  icons: { apple: '/icon-512.png' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: siteConfig.name,
  },
};

export const viewport: Viewport = {
  themeColor: '#0C0B10',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Pure on-device PWA: no auth provider, no backend, no environment variables.
  return (
    <html lang="en">
      <body className={cn('min-h-screen bg-background text-foreground antialiased')}>
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
