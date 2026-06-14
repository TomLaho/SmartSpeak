'use client';

import { useEffect, useRef, useState } from 'react';
import type { AudioEvent, AudioEventType } from '@/lib/audio-dsp';

function fmt(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const STYLES: Record<AudioEventType, { color: string; label: string }> = {
  filler: { color: '#f59e0b', label: 'Hesitation' },
  pause: { color: '#38bdf8', label: 'Long pause' },
};

/**
 * Self-review player: replay the recording with a scrubbable timeline marked up
 * with the hesitations and long pauses the analysis found. Tap a marker to jump
 * straight to that moment and hear it.
 */
export function DeliveryTimeline({
  audioUrl,
  durationSec,
  events,
}: {
  audioUrl: string;
  durationSec: number;
  events: AudioEvent[];
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(durationSec || 0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setTime(a.currentTime || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setTime(0);
    };
    const onMeta = () => {
      // MediaRecorder blobs often report Infinity duration until forced to seek.
      if (!isFinite(a.duration)) {
        a.currentTime = 1e7;
        const fix = () => {
          a.currentTime = 0;
          setDur(isFinite(a.duration) ? a.duration : durationSec);
          a.removeEventListener('timeupdate', fix);
        };
        a.addEventListener('timeupdate', fix);
      } else {
        setDur(a.duration);
      }
    };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnded);
    a.addEventListener('loadedmetadata', onMeta);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', onEnded);
      a.removeEventListener('loadedmetadata', onMeta);
    };
  }, [durationSec]);

  const total = dur && isFinite(dur) && dur > 0 ? dur : durationSec || 1;
  const pct = (s: number) => `${Math.min(100, Math.max(0, (s / total) * 100))}%`;

  const seekTo = (sec: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(total - 0.05, sec));
    setTime(a.currentTime);
  };

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };

  const onTrackClick = (e: React.MouseEvent) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    seekTo(((e.clientX - rect.left) / rect.width) * total);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Replay &amp; review</p>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-spotlight text-ink text-base hover:bg-spotlight-soft"
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="min-w-0 flex-1">
          <div
            ref={trackRef}
            onClick={onTrackClick}
            className="relative h-10 w-full cursor-pointer overflow-hidden rounded-lg bg-white/10"
          >
            <div className="absolute inset-y-0 left-0 bg-white/10" style={{ width: pct(time) }} />
            {events.map((ev, i) => (
              <button
                key={`${ev.type}-${i}`}
                onClick={(e) => {
                  e.stopPropagation();
                  seekTo(ev.startSec);
                }}
                title={`${STYLES[ev.type].label} · ${fmt(ev.startSec)}`}
                aria-label={`${STYLES[ev.type].label} at ${fmt(ev.startSec)}`}
                className="absolute top-0 h-full rounded-sm"
                style={{
                  left: pct(ev.startSec),
                  width: `max(3px, ${Math.min(100, ((ev.endSec - ev.startSec) / total) * 100)}%)`,
                  backgroundColor: STYLES[ev.type].color,
                  opacity: 0.85,
                }}
              />
            ))}
            <div className="absolute top-0 h-full w-0.5 bg-white" style={{ left: pct(time) }} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-white/40">
            <span>{fmt(time)}</span>
            <span>{fmt(total)}</span>
          </div>
        </div>
      </div>

      {events.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/50">
          {(Object.keys(STYLES) as AudioEventType[]).map((t) => {
            const n = events.filter((e) => e.type === t).length;
            if (!n) return null;
            return (
              <span key={t} className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STYLES[t].color }} />
                {n} {STYLES[t].label.toLowerCase()}
                {n === 1 ? '' : 's'}
              </span>
            );
          })}
          <span className="text-white/35">· tap a marker to jump there</span>
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-white/40">
          Clean run — no hesitations or long pauses flagged. Play it back to hear yourself.
        </p>
      )}

      <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
    </div>
  );
}
