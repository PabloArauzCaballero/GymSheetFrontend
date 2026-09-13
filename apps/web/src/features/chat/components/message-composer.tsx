'use client';

import { Eye, MapPin, Paperclip, Send } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/cn';

/**
 * El redactor del hilo: texto, adjunto, ubicación y el interruptor de vista
 * única.
 *
 * «Vista única» se arma antes de elegir el archivo y se apaga solo tras
 * enviarlo, igual que en el móvil: es una decisión sobre *este* envío, no un
 * modo de la conversación, y dejarlo encendido haría que la siguiente foto
 * saliera efímera sin que nadie lo pidiera.
 */
export function MessageComposer({
  onSendLocation,
  onSendMedia,
  onSendText,
  sending,
  sendingMedia,
}: Readonly<{
  onSendLocation: () => void;
  onSendMedia: (file: File, viewOnce: boolean) => void;
  onSendText: (body: string) => void;
  sending: boolean;
  sendingMedia: boolean;
}>) {
  const [draft, setDraft] = useState('');
  const [viewOnceNext, setViewOnceNext] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const body = draft.trim();
        if (!body) return;
        onSendText(body);
        setDraft('');
      }}
    >
      <div className="flex items-end gap-2">
        <Button
          aria-label="Adjuntar una foto o un vídeo"
          disabled={sendingMedia}
          onClick={() => fileInputRef.current?.click()}
          size="icon"
          type="button"
          variant="secondary"
        >
          <Paperclip aria-hidden className="size-4" />
        </Button>
        <Button
          aria-label="Compartir mi ubicación"
          disabled={sendingMedia}
          onClick={onSendLocation}
          size="icon"
          type="button"
          variant="secondary"
        >
          <MapPin aria-hidden className="size-4" />
        </Button>
        <Input
          aria-label="Mensaje"
          className="flex-1"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Escribe un mensaje…"
          value={draft}
        />
        <Button disabled={!draft.trim()} loading={sending} type="submit" variant="primary">
          <Send aria-hidden className="size-4" />
          <span className="sr-only">Enviar</span>
        </Button>
      </div>

      <button
        aria-pressed={viewOnceNext}
        className={cn(
          'inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-[var(--dur-2)]',
          viewOnceNext
            ? 'border-[var(--volt)] bg-[var(--surface-high)] text-[var(--accent-ink)]'
            : 'border-[var(--border-subtle)] bg-[var(--surface-low)] text-[var(--text-muted)] hover:text-[var(--text)]',
        )}
        onClick={() => setViewOnceNext((value) => !value)}
        type="button"
      >
        <Eye aria-hidden className="size-3.5" />
        {viewOnceNext ? 'El próximo archivo será de vista única' : 'Enviar de vista única'}
      </button>

      <input
        accept="image/*,video/*"
        // Fuera del recorrido de teclado y del árbol de accesibilidad: quien
        // navega con teclado llega por el botón de adjuntar, que sí se anuncia.
        aria-hidden
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // El campo se limpia siempre: si no, elegir el mismo archivo dos
          // veces seguidas no dispara `change` y el envío parece ignorado.
          event.target.value = '';
          if (!file) return;
          onSendMedia(file, viewOnceNext);
          setViewOnceNext(false);
        }}
        ref={fileInputRef}
        tabIndex={-1}
        type="file"
      />
    </form>
  );
}
