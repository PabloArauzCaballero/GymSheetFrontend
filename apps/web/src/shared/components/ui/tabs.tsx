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
      className={cn('flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)]', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'group/tab relative min-h-11 shrink-0 px-4 text-sm font-medium text-[var(--text-muted)] transition-colors duration-[var(--dur-2)] hover:text-[var(--text)] data-[state=active]:font-semibold data-[state=active]:text-[var(--text)]',
        'after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:origin-left after:scale-x-0 after:rounded-full after:bg-[var(--volt)] after:transition-transform after:duration-[var(--dur-3)] after:ease-[var(--ease-out)] after:content-[""]',
        'data-[state=active]:after:scale-x-100',
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
