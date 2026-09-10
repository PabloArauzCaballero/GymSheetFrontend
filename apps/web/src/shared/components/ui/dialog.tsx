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
      <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-[2px]" />
      {/*
        El panel se centra con una capa flex, no desplazándose sobre sí mismo.
        Antes iba fijado al centro con `-translate-1/2` siendo a la vez su
        propio contenedor de scroll, y esas dos cosas se pelean: en cuanto el
        contenido no cabe —un formulario largo en un teléfono— cada
        desplazamiento recolocaba el panel, así que el botón que se quería
        pulsar se movía bajo el dedo. En las pruebas aparecía como que
        «Cancelar» o un campo interceptaban el clic sobre «Guardar»; en un móvil
        de verdad es el diálogo que salta mientras se hace scroll.
      */}
      <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-4">
        <DialogPrimitive.Content
          className={cn(
            'dialog-panel pointer-events-auto relative max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-[8px] border border-[var(--border)] bg-[var(--surface-lowest)] p-6 shadow-[var(--shadow-dialog)]',
            className,
          )}
        >
          <DialogPrimitive.Title className="pr-10 text-xl font-semibold tracking-[-0.02em]">
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
            className="absolute right-4 top-4 grid size-9 place-items-center rounded-[4px] border border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--text)]"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  );
}
