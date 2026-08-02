'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

export const Tabs = TabsPrimitive.Root;

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
        'group/tab relative min-h-11 shrink-0 px-4 text-sm font-semibold text-[var(--text-muted)] transition-colors duration-200 hover:text-[var(--text)] data-[state=active]:text-[var(--text)]',
        'after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:origin-left after:scale-x-0 after:rounded-full after:bg-[var(--volt)] after:transition-transform after:duration-300 after:ease-out after:content-[""]',
        'hover:after:scale-x-50 data-[state=active]:after:scale-x-100',
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
