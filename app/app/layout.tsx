import { ReactNode } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import { siteConfig } from '@/lib/site';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { href: '/app', label: 'Dashboard' },
  { href: '/app/practice', label: 'Practice' },
  { href: '/app/history', label: 'History' },
  { href: '/app/billing', label: 'Billing' },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/app" className="flex items-center gap-2 text-lg font-semibold">
              <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">{siteConfig.name}</span>
            </Link>
            <nav className="hidden items-center gap-4 text-sm font-medium text-muted-foreground md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn('hover:text-foreground', 'transition-colors')}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user?.primaryEmailAddress?.emailAddress && (
              <Badge variant="secondary" className="hidden text-xs sm:inline-flex">
                {user.primaryEmailAddress.emailAddress}
              </Badge>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-4 flex gap-3 md:hidden">
          {navItems.map((item) => (
            <Button key={item.href} asChild variant="outline" size="sm">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </div>
        {children}
      </main>
    </div>
  );
}
