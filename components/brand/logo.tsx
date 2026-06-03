import { cn } from '@/lib/utils';

/**
 * SmartSpeak brand mark.
 *
 * This is the exact mark shipped as the installed app icon (`app/icon.svg`),
 * re-used inline so the in-app branding always matches the home-screen icon.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 192 192"
      className={className}
      role="img"
      aria-label="SmartSpeak"
    >
      <defs>
        <linearGradient id="ss-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <rect width="192" height="192" rx="44" fill="url(#ss-logo-g)" />
      <g fill="#fff">
        <rect x="86" y="36" width="20" height="70" rx="10" />
        <path d="M64 92a32 32 0 0 0 64 0h-14a18 18 0 0 1-36 0z" />
        <rect x="86" y="130" width="20" height="26" rx="6" />
        <rect x="66" y="150" width="60" height="12" rx="6" />
      </g>
      <g fill="#fde68a">
        <circle cx="146" cy="52" r="6" />
        <circle cx="162" cy="74" r="4" />
        <circle cx="150" cy="92" r="3" />
      </g>
    </svg>
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
      <LogoMark size={size} className="shrink-0 rounded-[28%] shadow-sm" />
      {withWordmark && (
        <span className={cn('text-lg font-bold tracking-tight', wordmarkClassName)}>SmartSpeak</span>
      )}
    </span>
  );
}
