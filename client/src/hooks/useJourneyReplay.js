import { useCallback, useEffect, useRef, useState } from 'react';
import { PREVIEW_DURATION, PREVIEW_SCRIPT } from '../constants/previewScript.js';
import { buildJourneyScript, scriptDuration } from '../utils/journeyScript.js';

/**
 * Idle preview loop for example URLs (no API).
 */
export function useIdlePreview() {
  const [previewActive, setPreviewActive] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  const startPreview = useCallback(() => {
    setPreviewActive(true);
    setPreviewTime(0);
    startRef.current = performance.now();

    const tick = (now) => {
      const elapsed = (now - startRef.current) % PREVIEW_DURATION;
      setPreviewTime(elapsed);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopPreview = useCallback(() => {
    setPreviewActive(false);
    setPreviewTime(0);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  return {
    previewActive,
    previewTime,
    previewScript: PREVIEW_SCRIPT,
    previewDuration: PREVIEW_DURATION,
    startPreview,
    stopPreview,
  };
}

/**
 * Replay scrubber state for completed analysis.
 */
export function useJourneyReplay(results) {
  const script = results ? buildJourneyScript(results) : [];
  const duration = scriptDuration(script) || 1;
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.2);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const baseRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    timeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    timeRef.current = 0;
    baseRef.current = 0;
  }, [results?.target?.analyzedAt]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return undefined;
    }

    startRef.current = performance.now();
    baseRef.current = timeRef.current;

    const tick = (now) => {
      const elapsed = (now - startRef.current) * speed;
      const next = baseRef.current + elapsed;
      if (next >= duration) {
        setCurrentTime(duration);
        timeRef.current = duration;
        setIsPlaying(false);
        return;
      }
      setCurrentTime(next);
      timeRef.current = next;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, speed, duration]);

  const seek = useCallback((t) => {
    const clamped = Math.max(0, Math.min(duration, t));
    setCurrentTime(clamped);
    baseRef.current = clamped;
    timeRef.current = clamped;
  }, [duration]);

  const playPause = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const step = useCallback((dir) => {
    const phases = script.filter((e) => e.type === 'phase-start');
    const idx = phases.findIndex((e) => e.at > currentTime);
    const target = dir > 0
      ? phases[idx]?.at ?? duration
      : phases[Math.max(0, idx - 2)]?.at ?? 0;
    seek(target);
  }, [script, currentTime, duration, seek]);

  return {
    script,
    duration,
    currentTime,
    isPlaying,
    speed,
    seek,
    playPause,
    play,
    setSpeed,
    step,
  };
}
