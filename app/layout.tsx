import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { siteConfig } from '@/lib/site';
import { isClerkConfigured } from '@/lib/clerk-config';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: `${siteConfig.name} | 5-minute speaking workouts`,
  description: siteConfig.description,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: siteConfig.name,
  },
};

export const viewport: Viewport = {
  themeColor: '#6d28d9',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const body = (
    <html lang="en">
      <body className={cn('min-h-screen bg-background text-foreground antialiased')}>
        {children}
      </body>
    </html>
  );

  // Only mount Clerk when it is configured so the zero-backend demo
  // (the /train trainer) runs without any environment variables.
  if (!isClerkConfigured) return body;

  return <ClerkProvider>{body}</ClerkProvider>;
}
