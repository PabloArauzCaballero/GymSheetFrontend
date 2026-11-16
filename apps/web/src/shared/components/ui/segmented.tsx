'use client';

import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';

export interface SegmentOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

/**
 * Selector de dos o tres opciones excluyentes, con una sola píldora que se
 * desliza a la elegida (se lee como un interruptor, no como pestañas sueltas).
 * Es un `radiogroup`: las flechas cambian de opción, como en un grupo de
 * radios nativo. Sin acento de marca: el color queda para el músculo.
 *
 * With `tabsFor` it switches whole views (Editar / Vista previa), so it is
 * announced as a `tablist` whose tabs control the panel with that id.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  tabsFor,
}: Readonly<{
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  label: string;
  /** Id of the panel these options switch: renders tab semantics instead of radio. */
  tabsFor?: string;
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

  // The pill follows the real size of the chosen button, and the options stack when their labels
  // no longer fit side by side (very large text on a narrow phone) instead of overlapping.
  const groupRef = useRef<HTMLDivElement>(null);
  const count = options.length;
  // Re-measure when the labels change (a new `options` array alone is not a change).
  const labels = options.map((option) => option.label).join('|');
  const measureRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [stacked, setStacked] = useState(false);
  const [pill, setPill] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const layout = () => {
      // Room up to the content edge of the page column, not the parent's width: a parent that the
      // unstacked options themselves widened would always say they fit.
      const column = group.closest('main') ?? document.documentElement;
      const padRight = parseFloat(getComputedStyle(column).paddingRight) || 0;
      const columnRight = Math.min(column.getBoundingClientRect().right, document.documentElement.clientWidth) - padRight;
      const available = Math.min(group.parentElement?.clientWidth ?? Infinity, columnRight - group.getBoundingClientRect().left);
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const widest = Math.max(...measureRefs.current.map((span) => span?.scrollWidth ?? 0));
      // Each option: its label + 2 × 1rem padding, never under 5.5rem; plus the 3px inset on both sides.
      setStacked(count * Math.max(widest + 2 * rem, 5.5 * rem) + 8 > available);
      const button = refs.current[index];
      if (!button) return;
      const next = { left: button.offsetLeft, top: button.offsetTop, width: button.offsetWidth, height: button.offsetHeight };
      // Only a real change re-renders.
      setPill((current) => (current && current.left === next.left && current.top === next.top && current.width === next.width && current.height === next.height ? current : next));
    };
    layout();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(layout);
    observer.observe(group);
    if (group.parentElement) observer.observe(group.parentElement);
    return () => observer.disconnect();
  }, [index, count, labels, stacked]);

  return (
    <div
      aria-label={label}
      className="relative inline-grid max-w-full rounded-[1.5rem] border border-[var(--border-subtle)] bg-[var(--surface-high)] p-[3px]"
      onKeyDown={onKeyDown}
      ref={groupRef}
      role={tabsFor ? 'tablist' : 'radiogroup'}
      style={{ gridTemplateColumns: stacked ? 'minmax(0, 1fr)' : `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {/* Invisible copies of the labels, unwrapped: their width decides side by side or stacked. */}
      {options.map((option, position) => (
        <span
          aria-hidden
          className="pointer-events-none invisible absolute left-0 top-0 h-0 w-0 overflow-hidden whitespace-nowrap text-sm font-semibold"
          key={`measure-${option.value}`}
          ref={(element) => {
            measureRefs.current[position] = element;
          }}
        >
          {option.label}
        </span>
      ))}
      {pill ? (
        <span
          aria-hidden
          className="absolute rounded-[calc(1.5rem-3px)] bg-[var(--surface-highest)] shadow-[0_2px_8px_rgb(0_0_0/0.25)] transition-[transform,width,height] duration-[var(--dur-3)] ease-[var(--ease-out)] motion-reduce:transition-none"
          style={{ left: 0, top: 0, width: pill.width, height: pill.height, transform: `translate(${pill.left}px, ${pill.top}px)` }}
        />
      ) : null}
      {options.map((option, position) => {
        const active = position === index;
        return (
          <button
            aria-checked={tabsFor ? undefined : active}
            aria-controls={tabsFor}
            aria-selected={tabsFor ? active : undefined}
            id={tabsFor ? `${tabsFor}-tab-${option.value}` : undefined}
            className={
              `relative z-[1] min-h-11 ${stacked ? 'min-w-0' : 'min-w-[5.5rem]'} rounded-[calc(1.5rem-3px)] px-4 py-1 text-sm leading-tight [overflow-wrap:anywhere] transition-colors duration-[var(--dur-1)] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-ink)] ` +
              (active ? `font-semibold text-[var(--text)] ${pill ? '' : 'bg-[var(--surface-highest)]'}` : 'font-medium text-[var(--text-muted)] hover:text-[var(--text)]')
            }
            key={option.value}
            onClick={() => onChange(option.value)}
            ref={(element) => {
              refs.current[position] = element;
            }}
            role={tabsFor ? 'tab' : 'radio'}
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
