'use client';

import { cn } from '@/lib/utils';

type Tier = 'green' | 'amber' | 'red';

interface TierBadgeProps {
  tier?: Tier;
  score?: number;
  className?: string;
}

const TIER_CONFIG: Record<Tier, { label: string; bg: string; text: string; ring: string }> = {
  green: {
    label: 'On target',
    bg: 'bg-tier-green/15',
    text: 'text-tier-green',
    ring: 'ring-tier-green/30',
  },
  amber: {
    label: 'Tune it',
    bg: 'bg-tier-amber/15',
    text: 'text-tier-amber',
    ring: 'ring-tier-amber/30',
  },
  red: {
    label: 'Focus here',
    bg: 'bg-tier-red/15',
    text: 'text-tier-red',
    ring: 'ring-tier-red/30',
  },
};

/** Derives tier from score if tier prop not provided. 0–59 → red, 60–79 → amber, 80+ → green. */
function tierFromScore(score: number): Tier {
  if (score >= 80) return 'green';
  if (score >= 60) return 'amber';
  return 'red';
}

/**
 * Small colored pill indicating feedback severity / performance band.
 * Pass `tier` directly or provide `score` and the tier is derived automatically.
 */
export function TierBadge({ tier, score, className }: TierBadgeProps) {
  const resolved: Tier = tier ?? (score !== undefined ? tierFromScore(score) : 'amber');
  const { label, bg, text, ring } = TIER_CONFIG[resolved];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5',
        'text-xs font-medium ring-1 ring-inset',
        bg,
        text,
        ring,
        className,
      )}
    >
      {label}
    </span>
  );
}
