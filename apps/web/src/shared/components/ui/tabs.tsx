'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ComponentProps, KeyboardEvent } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * La raíz lleva `min-w-0` a propósito.
 *
 * `TabsList` ya scrollea en horizontal, pero eso no basta cuando la raíz es
 * hijo de un `grid`/`flex`: un ítem de rejilla tiene `min-width: auto`, así que
 * se niega a encogerse por debajo del contenido mínimo de sus hijos y crece con
 * la tira de pestañas en vez de dejarla desplazarse. En `/admin/facilities`
 * —cinco pestañas dentro de un `grid gap-8`— eso empujaba la página 107 px a
 * 412 px de ancho: barra de scroll horizontal en toda la pantalla (M-12).
 * Se arregla aquí, y no en cada página, porque el defecto es de la pieza.
 */
export function Tabs({ className, ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn('min-w-0', className)} {...props} />;
}

const TABBABLE = 'a[href], button:not(:disabled), input:not(:disabled):not([type=hidden]), select:not(:disabled), textarea:not(:disabled), [tabindex]';

/**
 * Shift+Tab out of a tab strip inside a dialog. Radix's roving group drops its own tab stop only after the
 * key event, but the dialog's focus trap measures its edges during it: it still counts the strip as a stop,
 * so it does not wrap, the browser leaves the dialog and the trap pulls focus back onto the tab (stuck).
 * Here the step back is taken explicitly: the previous stop in the dialog, wrapping to its last one.
 */
function shiftTabOutOfDialogStrip(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key !== 'Tab' || !event.shiftKey) return;
  const list = event.currentTarget;
  const dialog = list.closest<HTMLElement>('[role=dialog],[role=alertdialog]');
  if (!dialog) return;
  const stops = [...dialog.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (el) => el.tabIndex >= 0 && !list.contains(el) && el !== list && el.getClientRects().length > 0,
  );
  const before = stops.filter((el) => el.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING);
  const target = before.at(-1) ?? stops.at(-1);
  if (!target) return;
  event.preventDefault();
  event.stopPropagation();
  target.focus();
}

export function TabsList({ className, onKeyDown, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      onKeyDown={(event) => {
        onKeyDown?.(event);
        shiftTabOutOfDialogStrip(event);
      }}
      className={cn(// Píldora segmentada del móvil (`SegmentedPill`): carril `surfaceLow`,
        // opción activa en `surfaceHighest`, sin subrayado de acento.
        'nav-scroll inline-flex max-w-full flex-wrap gap-1 overflow-x-auto rounded-[1.5rem] bg-[var(--surface-low)] p-1 shadow-[var(--shadow-sm)]', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        // Labels wrap between words, and the row itself wraps, on a 320 px phone or at 200 % text: no tab hides behind a sideways scroll.
        'group/tab relative min-h-11 rounded-[calc(1.5rem-4px)] px-4 py-1 text-[0.9375rem] font-semibold leading-tight text-balance text-[var(--text-muted)] transition-[background-color,color] duration-[var(--dur-2)] ease-[var(--ease-out)] hover:text-[var(--text)] data-[state=active]:bg-[var(--surface-highest)] data-[state=active]:text-[var(--text)] data-[state=active]:shadow-[0_2px_8px_rgb(0_0_0/0.25)]',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(
        // No `outline-none`: a panel with nothing focusable inside is a Tab stop (Radix, tabIndex 0) and shows
        // the global focus-visible ring; panels holding controls are taken out of the order (`tabIndex={-1}`).
        'pt-6 data-[state=active]:motion-safe:animate-[fade-in_0.35s_ease-out]',
        className,
      )}
      {...props}
    />
  );
}
