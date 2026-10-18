'use client';

import { Forward } from 'lucide-react';
import type { Message } from '@/shared/api/schemas';
import { cn } from '@/shared/lib/cn';

type ChatMessage = Exclude<Message, { type: 'system' }>;

const REPLY_LABELS: Record<string, string> = {
  image: 'Foto',
  video: 'Video',
  audio: 'Nota de voz',
  location: 'Ubicación',
  sticker: 'Sticker',
};

/** Una línea de la cita: el texto del original o qué era, como en el móvil. */
export function replyLine(reply: NonNullable<ChatMessage['replyTo']>): string {
  if (!reply.available) return 'Este mensaje ya no está disponible';
  return reply.body || REPLY_LABELS[reply.type] || '';
}

/**
 * Lo que el móvil añadió al estilo WhatsApp y la web solo muestra: «Reenviado»,
 * la cita de una respuesta (que lleva al original si sigue en el hilo) y las
 * reacciones bajo la burbuja. Responder y reaccionar se hacen desde el móvil.
 */
export function MessageForwarded({ message }: Readonly<{ message: ChatMessage }>) {
  if (!message.forwarded || message.deletedAt) return null;
  return (
    <span className="flex items-center gap-1 text-xs italic opacity-75">
      <Forward aria-hidden className="size-3" /> Reenviado
    </span>
  );
}

export function MessageQuote({
  message,
  viewerId,
  otherName,
}: Readonly<{ message: ChatMessage; viewerId?: string; otherName?: string }>) {
  const reply = message.replyTo;
  if (!reply || message.deletedAt) return null;
  const author = reply.senderId === viewerId ? 'Tú' : (otherName ?? 'Contacto');
  const line = replyLine(reply);
  return (
    <a
      aria-label={`Respuesta a ${author}: ${line}`}
      className={cn(
        'block rounded-[var(--radius-sm)] border-l-4 border-current/50 bg-black/15 px-2 py-1 text-xs',
        !reply.available && 'pointer-events-none italic',
      )}
      href={`#message-${reply.messageId}`}
      onClick={(event) => {
        const target = document.getElementById(`message-${reply.messageId}`);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        target.focus({ preventScroll: true });
      }}
    >
      <span className="block font-semibold">{author}</span>
      <span className="line-clamp-2 opacity-80">{line}</span>
    </a>
  );
}

export function MessageReactions({
  message,
  viewerId,
}: Readonly<{ message: ChatMessage; viewerId?: string }>) {
  const reactions = message.deletedAt ? [] : (message.reactions ?? []);
  if (!reactions.length) return null;
  const counts = new Map<string, number>();
  for (const reaction of reactions)
    counts.set(reaction.emoji, (counts.get(reaction.emoji) ?? 0) + 1);
  const mine = reactions.find((reaction) => reaction.userId === viewerId)?.emoji;
  const label = [...counts]
    .map(([emoji, count]) => (count > 1 ? `${emoji} ${count}` : emoji))
    .join(', ');
  return (
    <span
      aria-label={`Reacciones: ${label}${mine ? `. Tu reacción: ${mine}` : ''}`}
      className="-mb-4 self-end rounded-full border-2 border-[var(--background)] bg-[var(--surface-high)] px-1.5 text-sm text-[var(--text)]"
      role="img"
    >
      {[...counts.keys()].join('')}
      {reactions.length > 1 ? (
        <span className="ml-1 text-xs text-[var(--text-muted)]">{reactions.length}</span>
      ) : null}
    </span>
  );
}
