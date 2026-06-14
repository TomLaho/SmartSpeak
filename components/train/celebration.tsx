'use client';

import { useEffect, useRef } from 'react';
import { haptic } from '@/lib/haptics';

interface CelebrationProps {
  show: boolean;
  variant?: 'goal' | 'streak' | 'pb';
  onDone?: () => void;
}

// Deterministic confetti pieces so SSR can render the same markup.
const PIECES = Array.from({ length: 24 }, (_, i) => {
  // Spread x from -120 to +120, stagger delays, vary sizes and colors.
  const angle = (i / 24) * 360;
  const rad = (angle * Math.PI) / 180;
  const dist = 80 + (i % 4) * 20;
  const tx = Math.round(Math.cos(rad) * dist);
  const delay = (i * 37) % 400; // ms, spread 0–400
  const size = 6 + (i % 3) * 3;
  const rotation = (i * 47) % 360;
  const COLORS = ['#FFC857', '#3DD68C', '#ffffff', '#FFD98A', '#6EE7B0', '#FFB454'];
  const color = COLORS[i % COLORS.length];
  const shape = i % 3 === 0 ? 'rounded-full' : i % 3 === 1 ? 'rounded-sm' : '';

  return { tx, delay, size, rotation, color, shape };
});

/**
 * Lightweight full-screen confetti burst overlay.
 * Absolutely positioned, pointer-events-none. Auto-clears after ~1s.
 * Fires haptic('celebrate') on show. Pure CSS/JS — no libraries.
 */
export function Celebration({ show, variant: _variant = 'goal', onDone }: CelebrationProps) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!show) {
      firedRef.current = false;
      return;
    }

    if (!firedRef.current) {
      firedRef.current = true;
      haptic('celebrate');
    }

    const timer = setTimeout(() => {
      onDone?.();
    }, 1000);

    return () => clearTimeout(timer);
  }, [show, onDone]);

  if (!show) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
    >
      {PIECES.map((p, i) => (
        <span
          key={i}
          className={`absolute block ${p.shape}`}
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            // Center origin + scatter via tx.
            left: '50%',
            top: '40%',
            transform: `translate(-50%, -50%) translateX(${p.tx}px)`,
            animation: `confetti-fall 0.9s ease-out ${p.delay}ms forwards`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  );
}
