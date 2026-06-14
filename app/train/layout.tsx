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
    <div className="min-h-[100dvh] bg-ink text-white">
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-gradient-to-b from-ink-800 via-ink to-ink shadow-2xl sm:my-0 relative overflow-hidden">
        {/* Spotlight glow — warm gold radial emanating from top */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64 z-0"
          style={{
            background:
              'radial-gradient(ellipse at top, rgba(255,200,87,0.10) 0%, transparent 60%)',
          }}
        />
        <div className="relative z-10 flex-1">{children}</div>
        <TabBar />
      </div>
    </div>
  );
}
