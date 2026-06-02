import { ReactNode } from 'react';
import { TabBar } from '@/components/train/tab-bar';

/**
 * Mobile-first shell for the SmartSpeak trainer.
 *
 * Renders as a centered "phone" column on large screens and full-bleed on
 * mobile, with a dark, app-like theme that is intentionally distinct from the
 * light marketing/cloud surfaces.
 */
export default function TrainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white">
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 shadow-2xl sm:my-0">
        <div className="flex-1">{children}</div>
        <TabBar />
      </div>
    </div>
  );
}
