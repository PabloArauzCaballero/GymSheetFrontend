'use client';

import type { FormEvent } from 'react';

/** Barra inferior para responder a una story ajena. */
export function StoryReplyBar({
  fullName,
  onCancel,
  onChangeText,
  onOpen,
  onSubmit,
  open,
  pending,
  text,
}: Readonly<{
  fullName: string;
  onCancel: () => void;
  onChangeText: (value: string) => void;
  onOpen: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  open: boolean;
  pending: boolean;
  text: string;
}>) {
  return (
    <div
      className="absolute inset-x-3 bottom-3 z-20 rounded-[var(--radius-lg)] bg-[rgb(var(--scrim-channels)/0.72)] p-2"
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      {open ? (
        <form className="flex items-center gap-2" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="story-reply-text">Responder a la story de {fullName}</label>
          <input
            autoFocus
            className="min-w-0 flex-1 rounded-full border border-white/30 bg-black/30 px-4 py-2 text-sm text-white placeholder:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            disabled={pending}
            id="story-reply-text"
            maxLength={1000}
            onChange={(event) => onChangeText(event.target.value)}
            placeholder="Escribe una respuesta…"
            value={text}
          />
          <button
            className="tap rounded-full bg-[var(--volt)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60"
            disabled={!text.trim() || pending}
            type="submit"
          >
            {pending ? 'Enviando…' : 'Enviar'}
          </button>
          <button
            aria-label="Cancelar respuesta"
            className="tap size-10 rounded-full text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            disabled={pending}
            onClick={() => onCancel()}
            type="button"
          >
            ×
          </button>
        </form>
      ) : (
        <button
          className="tap w-full rounded-full border border-white/40 px-4 py-2 text-left text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          onClick={() => onOpen()}
          type="button"
        >
          Responder a {fullName}…
        </button>
      )}
    </div>
  );
}
