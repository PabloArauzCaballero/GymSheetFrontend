'use client';

import { Minus, Plus, SkipForward } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/shared/components/ui/button';

function display(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function RestTimer() {
  const [target, setTarget] = useState(90);
  const [remaining, setRemaining] = useState(90);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running]);
  const progress = useMemo(() => (target === 0 ? 0 : remaining / target), [remaining, target]);
  const circumference = 2 * Math.PI * 45;
  const finished = remaining === 0;
  const accent = finished
    ? 'var(--volt)'
    : remaining <= 10
      ? 'var(--danger)'
      : remaining <= 30
        ? 'var(--warning)'
        : 'var(--volt)';
  function adjust(delta: number) {
    setTarget((value) => Math.max(15, Math.min(600, value + delta)));
    setRemaining((value) => Math.max(15, Math.min(600, value + delta)));
  }
  return (
    <section className="panel relative grid justify-items-center overflow-hidden p-6 sm:p-8">
      <div className="absolute left-5 top-5 flex items-center gap-2">
        <span
          className={`size-2 rounded-full transition-colors ${running ? 'animate-pulse bg-[var(--volt)] shadow-[0_0_8px_var(--volt)]' : 'bg-[var(--text-disabled)]'}`}
        />
        <span className="data-label">
          {finished ? '¡Descanso listo!' : `Descanso ${running ? 'activo' : 'pausado'}`}
        </span>
      </div>
      <div
        className={`relative mt-8 grid size-52 place-items-center transition-transform duration-300 ${finished ? 'animate-pop' : running ? 'scale-[1.02]' : 'scale-100'}`}
      >
        <svg aria-hidden className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" fill="none" r="45" stroke="var(--surface-high)" strokeWidth="2" />
          <circle
            cx="50"
            cy="50"
            fill="none"
            r="45"
            stroke={accent}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            strokeWidth="2.5"
            style={{
              transition: 'stroke-dashoffset 0.9s linear, stroke 0.4s ease',
              filter: `drop-shadow(0 0 6px ${accent})`,
            }}
          />
        </svg>
        <span
          className="data-value text-5xl font-extrabold tracking-[-0.05em] transition-colors duration-300"
          style={{ color: accent }}
        >
          {display(remaining)}
        </span>
      </div>
      <div className="mt-7 flex items-center gap-4">
        <Button
          aria-label="Restar 15 segundos"
          onClick={() => adjust(-15)}
          size="icon"
          variant="secondary"
        >
          <Minus className="size-4" />
        </Button>
        <Button
          className="size-16 rounded-full"
          onClick={() => {
            setRunning((value) => !value);
            if (remaining === 0) setRemaining(target);
          }}
          size="icon"
          variant="primary"
        >
          <SkipForward className="size-6" />
        </Button>
        <Button
          aria-label="Agregar 15 segundos"
          onClick={() => adjust(15)}
          size="icon"
          variant="secondary"
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <p className="mt-4 text-xs text-[var(--text-muted)]">
        Temporizador local de interfaz; no modifica el historial del backend.
      </p>
    </section>
  );
}
