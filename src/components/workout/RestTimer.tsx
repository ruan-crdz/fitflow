import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RestTimerProps {
  active: boolean;
  duration?: number;
  onSkip: () => void;
}

export function RestTimer({ active, duration = 75, onSkip }: RestTimerProps) {
  const [seconds, setSeconds] = useState(duration);

  useEffect(() => {
    if (active) setSeconds(duration);
  }, [active, duration]);

  useEffect(() => {
    if (!active || seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [active, seconds]);

  const playAlarm = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playBeep = (time: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
        osc.start(time);
        osc.stop(time + 0.25);
      };
      // 3 ascending beeps
      playBeep(ctx.currentTime, 660);
      playBeep(ctx.currentTime + 0.3, 880);
      playBeep(ctx.currentTime + 0.6, 1100);
    } catch {}
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
  }, []);

  useEffect(() => {
    if (active && seconds === 0) playAlarm();
  }, [active, seconds, playAlarm]);

  const progress = 1 - seconds / duration;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-dark-400/95 backdrop-blur-md"
        >
          <p className="text-white/40 text-sm font-medium mb-6">Descanso</p>

          <div className="relative w-44 h-44">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle
                cx="60" cy="60" r={radius} fill="none"
                stroke={seconds === 0 ? '#22c55e' : 'rgb(var(--color-primary-rgb))'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold tabular-nums">
                {seconds === 0 ? '✓' : seconds}
              </span>
              {seconds > 0 && <span className="text-white/30 text-xs mt-1">segundos</span>}
            </div>
          </div>

          <p className="mt-6 text-white/50 text-sm">
            {seconds === 0 ? 'Bora pra próxima série! 🔥' : 'Respire e se prepare...'}
          </p>

          <button
            onClick={onSkip}
            className="mt-8 px-8 py-3 rounded-xl border border-white/10 text-white/60 font-medium text-sm"
          >
            {seconds === 0 ? 'Continuar' : 'Pular descanso →'}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
