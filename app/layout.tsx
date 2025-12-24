import './globals.css';
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { siteConfig } from '@/lib/site';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: `${siteConfig.name} | AI Speech Coaching`,
  description: siteConfig.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={cn('min-h-screen bg-background text-foreground antialiased')}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
