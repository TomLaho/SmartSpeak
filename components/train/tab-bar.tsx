'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MicrophoneIcon, ChartBarIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import {
  MicrophoneIcon as MicrophoneSolid,
  ChartBarIcon as ChartBarSolid,
  UserCircleIcon as UserCircleSolid,
} from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/train', label: 'Practice', Icon: MicrophoneIcon, IconActive: MicrophoneSolid },
  { href: '/train/progress', label: 'Progress', Icon: ChartBarIcon, IconActive: ChartBarSolid },
  { href: '/train/profile', label: 'Profile', Icon: UserCircleIcon, IconActive: UserCircleSolid },
];

export function TabBar() {
  const pathname = usePathname();
  // Hide the chrome during a lesson and the paywall for a focused, full-screen view.
  if (pathname.includes('/train/exercise/') || pathname === '/train/unlock') return null;
  return (
    <nav className="sticky bottom-0 z-20 border-t border-white/10 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const active = tab.href === '/train' ? pathname === '/train' : pathname.startsWith(tab.href);
          const Glyph = active ? tab.IconActive : tab.Icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition-colors',
                active ? 'text-spotlight' : 'text-white/40 hover:text-white/60'
              )}
            >
              <Glyph className={cn('h-6 w-6 transition-transform', active && 'scale-105')} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
