'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  children,
  title,
  description,
  className,
}: Readonly<{ children: ReactNode; title: string; description?: string; className?: string }>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(
          'dialog-panel fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[8px] border border-[var(--border)] bg-[var(--surface-lowest)] p-6 shadow-[0_40px_120px_-40px_rgb(0_0_0/0.9)]',
          className,
        )}
      >
        <DialogPrimitive.Title className="pr-10 text-xl font-bold tracking-[-0.02em]">
          {title}
        </DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            {description}
          </DialogPrimitive.Description>
        ) : null}
        <div className="mt-6">{children}</div>
        <DialogPrimitive.Close
          aria-label="Cerrar"
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-[4px] border border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:text-white"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
