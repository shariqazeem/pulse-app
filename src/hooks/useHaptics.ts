"use client";

import { useCallback, useRef, useEffect } from "react";

/**
 * A hook that provides synthesized 'premium' UI sounds using the Web Audio API.
 * This avoids needing external MP3/WAV assets and provides instantaneous,
 * high-fidelity haptic auditory feedback (ticks, pops, chimes).
 */
export function useHaptics() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Only initialize the AudioContext on the client
    if (typeof window !== "undefined") {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        audioCtxRef.current = new AudioContext();
      }
    }
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const playTick = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    
    // Resume context if suspended (browser auto-play policy)
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  }, []);

  const playPop = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }, []);

  const playChime = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    // Create a beautiful, soft, multi-layered chime for success
    const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C major chord
    const duration = 1.5;

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.05);

      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + i * 0.05 + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.05 + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.05);
      osc.stop(ctx.currentTime + i * 0.05 + duration);
    });
  }, []);

  return { playTick, playPop, playChime };
}
