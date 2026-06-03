import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * SmartSpeak brand mark.
 *
 * Renders the exact PNG shipped as the installed app icon (`app/icon.png` /
 * `public/icon-512.png`) so the in-app branding always matches the home-screen
 * icon across the marketing site and the trainer.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/icon-512.png"
      width={size}
      height={size}
      alt="SmartSpeak"
      className={cn('select-none', className)}
    />
  );
}

/** Brand mark + wordmark lockup. */
export function Logo({
  size = 32,
  withWordmark = true,
  className,
  wordmarkClassName,
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark size={size} className="shrink-0" />
      {withWordmark && (
        <span className={cn('text-lg font-bold tracking-tight', wordmarkClassName)}>SmartSpeak</span>
      )}
    </span>
  );
}
