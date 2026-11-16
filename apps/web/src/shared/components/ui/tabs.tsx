'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ComponentProps } from 'react';
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

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
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
        'pt-6 focus:outline-none data-[state=active]:motion-safe:animate-[fade-in_0.35s_ease-out]',
        className,
      )}
      {...props}
    />
  );
}
