'use client';

import { useRef, type KeyboardEvent } from 'react';

export interface SegmentOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

/**
 * Selector de dos o tres opciones excluyentes, con una sola píldora que se
 * desliza a la elegida (se lee como un interruptor, no como pestañas sueltas).
 * Es un `radiogroup`: las flechas cambian de opción, como en un grupo de
 * radios nativo. Sin acento de marca: el color queda para el músculo.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: Readonly<{
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  label: string;
}>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, options.findIndex((option) => option.value === value));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      aria-label={label}
      className="relative inline-grid rounded-full border border-[var(--border-subtle)] bg-[var(--surface-high)] p-[3px]"
      onKeyDown={onKeyDown}
      role="radiogroup"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute bottom-[3px] left-[3px] top-[3px] rounded-full bg-[var(--surface-highest)] shadow-[0_2px_8px_rgb(0_0_0/0.25)] transition-transform duration-[var(--dur-3)] ease-[var(--ease-out)] motion-reduce:transition-none"
        style={{
          width: `calc((100% - 6px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((option, position) => {
        const active = position === index;
        return (
          <button
            aria-checked={active}
            className={
              'relative z-[1] h-9 min-w-[5.5rem] rounded-full px-4 text-sm transition-colors duration-[var(--dur-1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-ink)] ' +
              (active ? 'font-semibold text-[var(--text)]' : 'font-medium text-[var(--text-muted)] hover:text-[var(--text)]')
            }
            key={option.value}
            onClick={() => onChange(option.value)}
            ref={(element) => {
              refs.current[position] = element;
            }}
            role="radio"
            tabIndex={active ? 0 : -1}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
