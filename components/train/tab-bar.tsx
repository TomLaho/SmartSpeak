'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/train', label: 'Train', icon: '🎯' },
  { href: '/train/progress', label: 'Progress', icon: '📈' },
  { href: '/train/profile', label: 'Profile', icon: '👤' },
];

export function TabBar() {
  const pathname = usePathname();
  // Hide the chrome during a lesson for an immersive, full-screen take.
  if (pathname.includes('/train/exercise/')) return null;
  return (
    <nav className="sticky bottom-0 z-20 border-t border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const active = tab.href === '/train' ? pathname === '/train' : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition-colors',
                active ? 'text-white' : 'text-white/45 hover:text-white/70'
              )}
            >
              <span className={cn('text-xl transition-transform', active && 'scale-110')}>{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
