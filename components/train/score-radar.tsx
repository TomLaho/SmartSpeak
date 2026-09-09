'use client';

import { cn } from '@/lib/utils';

export interface RadarAxis {
  /** e.g. 'Pace', 'Voice', 'Fluency', 'Opening', 'Structure', 'Substance' */
  label: string;
  /** 0-100. Values outside this range are clamped. */
  score: number;
}

interface ScoreRadarProps {
  axes: RadarAxis[];
  className?: string;
}

/** Tier thresholds mirror `dim()` in lib/coach.ts: green >=75, amber >=55, red below. */
type Tier = 'green' | 'amber' | 'red';

const TIER_COLOR: Record<Tier, string> = {
  green: '#3DD68C', // tier-green
  amber: '#FFB454', // tier-amber
  red: '#FF6B6B', // tier-red
};

function tierFor(score: number): Tier {
  if (score >= 75) return 'green';
  if (score >= 55) return 'amber';
  return 'red';
}

function clampScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

const SIZE = 360;
const CENTER = SIZE / 2;
const MAX_RADIUS = 92;
const LABEL_RADIUS = MAX_RADIUS + 40;
const RINGS = [0.25, 0.5, 0.75, 1];
const SPOTLIGHT = '#FFC857';

function angleFor(index: number, count: number): number {
  // Start at the top (-90deg) and go clockwise.
  return (-90 + (index * 360) / count) * (Math.PI / 180);
}

function pointOn(radius: number, angle: number): [number, number] {
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)];
}

function polygonPoints(radius: number, count: number): string {
  return Array.from({ length: count }, (_, i) => pointOn(radius, angleFor(i, count)).join(','))
    .join(' ');
}

/**
 * Six-axis (Pokemon-stat-style) radar chart for post-take results. Pure SVG,
 * no charting library — one hexagon doesn't earn a dependency.
 *
 * Color language: the shape itself is a single identity (spotlight gold, low-
 * opacity fill per the app's "no full-strength fill on dark" rule) — mixing a
 * different hue per vertex on one polygon reads as noise. Per-axis performance
 * is instead carried by the vertex dot, colored by the same green/amber/red
 * tiers the results screen already uses (see `dim()` in lib/coach.ts). Label
 * and score text stay in muted/ink tokens per the "text wears text tokens,
 * never the series color" rule — the dot alone carries tier identity.
 */
export function ScoreRadar({ axes, className }: ScoreRadarProps) {
  const count = axes.length;
  if (count < 3) return null;

  const scores = axes.map((a) => clampScore(a.score));
  const points = axes.map((axis, i) => {
    const angle = angleFor(i, count);
    const score = scores[i];
    const [vx, vy] = pointOn((score / 100) * MAX_RADIUS, angle);
    const [lx, ly] = pointOn(LABEL_RADIUS, angle);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Vertical axes (top/bottom) anchor differently from side axes so the
    // label sits clear of the shape instead of centering on top of the point.
    let textAnchor: 'start' | 'middle' | 'end';
    let dominantBaseline: 'auto' | 'hanging' | 'central';
    if (Math.abs(cosA) < 0.15) {
      textAnchor = 'middle';
      dominantBaseline = sinA < 0 ? 'auto' : 'hanging';
    } else {
      textAnchor = cosA > 0 ? 'start' : 'end';
      dominantBaseline = 'central';
    }

    return { axis, angle, score, vx, vy, lx, ly, textAnchor, dominantBaseline };
  });

  const valuePolygon = points.map((p) => `${p.vx},${p.vy}`).join(' ');
  const spokes = points.map((p) => pointOn(MAX_RADIUS, p.angle));

  const summary = points.map((p) => `${p.axis.label} ${p.score}`).join(', ');

  return (
    <div className={cn('w-full', className)}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width="100%"
        role="img"
        aria-label={`Score breakdown: ${summary}`}
        className="overflow-visible"
      >
        <g aria-hidden="true">
          {/* Concentric guide rings */}
          {RINGS.map((fraction) => (
            <polygon
              key={fraction}
              points={polygonPoints(MAX_RADIUS * fraction, count)}
              fill="none"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth={1}
            />
          ))}

          {/* Axis spokes */}
          {spokes.map(([sx, sy], i) => (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={sx}
              y2={sy}
              stroke="rgba(255,255,255,0.10)"
              strokeWidth={1}
            />
          ))}

          {/* Value polygon: single identity hue, low-opacity fill so a large
              filled shape doesn't read as a full-strength accent block. */}
          <polygon
            points={valuePolygon}
            fill={SPOTLIGHT}
            fillOpacity={0.14}
            stroke={SPOTLIGHT}
            strokeWidth={2}
            strokeLinejoin="round"
            className="origin-center animate-pop"
          />

          {/* Vertex dots, colored by this axis's own tier */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.vx}
              cy={p.vy}
              r={4}
              fill={TIER_COLOR[tierFor(p.score)]}
              stroke="#0C0B10"
              strokeWidth={1.5}
            />
          ))}
        </g>

        {/* Labels + scores */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.lx}
            y={p.ly}
            textAnchor={p.textAnchor}
            dominantBaseline={p.dominantBaseline}
          >
            <tspan
              x={p.lx}
              dy={p.dominantBaseline === 'hanging' ? '0.2em' : p.dominantBaseline === 'auto' ? '-1.1em' : '-0.3em'}
              className="fill-white/50 text-[11px] font-medium"
            >
              {p.axis.label}
            </tspan>
            <tspan
              x={p.lx}
              dy="1.15em"
              className="fill-white/90 font-display text-[12px] font-semibold tabular-nums"
            >
              {p.score}
            </tspan>
          </text>
        ))}
      </svg>
    </div>
  );
}
