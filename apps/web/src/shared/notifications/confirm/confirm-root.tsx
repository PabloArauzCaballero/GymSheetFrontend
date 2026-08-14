'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle, HelpCircle, Info } from 'lucide-react';
import { useRef, useSyncExternalStore } from 'react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/cn';
import { confirmStore, type ActiveConfirmation } from './confirm-store';

const SEVERITY_ICON = {
  danger: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
} as const;

const SEVERITY_ACCENT: Record<ActiveConfirmation['severity'], string> = {
  danger: 'border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]',
  warning: 'border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)]',
  info: 'border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-text)]',
};

const CONFIRM_VARIANT: Record<ActiveConfirmation['severity'], 'danger' | 'primary'> = {
  danger: 'danger',
  warning: 'primary',
  info: 'primary',
};

/**
 * The single confirmation dialog for the whole app, mounted once in providers.
 * Radix supplies role="dialog", aria-modal, focus trap, Escape handling and
 * focus restoration; for destructive prompts we redirect initial focus to the
 * safe (Cancel) button.
 */
export function ConfirmRoot() {
  const active = useSyncExternalStore(
    confirmStore.subscribe,
    confirmStore.getSnapshot,
    confirmStore.getServerSnapshot,
  );
  const cancelRef = useRef<HTMLButtonElement>(null);

  const open = active !== null;
  const Icon = active ? SEVERITY_ICON[active.severity] : HelpCircle;

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        // Radix only calls this for user-initiated closes (Escape / overlay).
        // Button clicks advance the store directly, so a close here is a dismiss.
        if (!nextOpen && active?.dismissible) confirmStore.resolveActive('dismiss');
      }}
    >
      {active ? (
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-[100] bg-[var(--overlay)] backdrop-blur-[2px]" />
          <DialogPrimitive.Content
            onEscapeKeyDown={(event) => {
              if (!active.dismissible) event.preventDefault();
            }}
            onPointerDownOutside={(event) => {
              if (!active.dismissible) event.preventDefault();
            }}
            onOpenAutoFocus={(event) => {
              // Safe default on destructive prompts: focus Cancel, not Delete.
              if (active.severity === 'danger' && cancelRef.current) {
                event.preventDefault();
                cancelRef.current.focus();
              }
            }}
            className="dialog-panel fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[8px] border border-[var(--border)] bg-[var(--surface-lowest)] p-6 shadow-[0_40px_120px_-40px_rgb(0_0_0/0.9)]"
          >
            <div className="flex gap-4">
              <span
                aria-hidden
                className={cn(
                  'grid size-11 shrink-0 place-items-center rounded-full border',
                  SEVERITY_ACCENT[active.severity],
                )}
              >
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-lg font-bold tracking-[-0.02em]">
                  {active.title}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  {active.message}
                </DialogPrimitive.Description>
                {active.description ? (
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    {active.description}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                ref={cancelRef}
                onClick={() => confirmStore.resolveActive('cancel')}
                type="button"
                variant="ghost"
              >
                {active.cancelLabel}
              </Button>
              <Button
                onClick={() => confirmStore.resolveActive('confirm')}
                type="button"
                variant={CONFIRM_VARIANT[active.severity]}
              >
                {active.confirmLabel}
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      ) : null}
    </DialogPrimitive.Root>
  );
}
