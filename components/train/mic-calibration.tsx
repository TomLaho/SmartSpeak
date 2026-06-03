'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  captureCalibration,
  clearCalibration,
  loadCalibration,
  type CalibrationProfile,
} from '@/lib/calibration';

/** Profile control to run/clear the 2-second microphone calibration. */
export function MicCalibration() {
  const [profile, setProfile] = useState<CalibrationProfile | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setProfile(loadCalibration()), []);

  const run = async () => {
    setError(null);
    setRecording(true);
    try {
      setProfile(await captureCalibration(2));
    } catch {
      setError('Microphone access is required to calibrate.');
    } finally {
      setRecording(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white/80">🎚️ Microphone calibration</p>
          <p className="mt-1 text-sm text-white/55">
            {profile
              ? 'Your mic is calibrated — pauses, fillers and volume are tuned to your room.'
              : 'Take 2 seconds to tune the analysis to your room and mic for sharper feedback.'}
          </p>
        </div>
        {profile && (
          <span className="shrink-0 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-semibold text-green-300">
            Calibrated
          </span>
        )}
      </div>

      {recording ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-violet-500/10 p-3">
          <span className="h-3 w-3 animate-pulse rounded-full bg-violet-400" />
          <p className="text-sm text-white/75">Listening… speak normally for 2 seconds.</p>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={run} className="h-10 rounded-xl bg-violet-600 hover:bg-violet-500">
            {profile ? 'Re-calibrate' : 'Calibrate now'}
          </Button>
          {profile && (
            <Button
              variant="ghost"
              onClick={() => {
                clearCalibration();
                setProfile(null);
              }}
              className="h-10 rounded-xl text-white/50 hover:bg-white/10 hover:text-white/70"
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      {profile && !recording && (
        <p className="mt-2 text-[11px] text-white/35">
          Calibrated{' '}
          {new Date(profile.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · tuned to your room
        </p>
      )}
    </div>
  );
}
