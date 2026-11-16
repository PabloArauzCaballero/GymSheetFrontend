'use client';

import { MessagesSquare, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ChatDot } from '@/features/chat/components/chat-dot';
import { Divider, ListCard } from '@/shared/components/mobile/nav-row';
import { notify } from '@/shared/notifications';

/** Glifo de fila, callado: un trazo gris; el protagonista es el héroe. */
export function RowGlyph({ icon: Icon }: Readonly<{ icon: LucideIcon }>) {
  return (
    <span aria-hidden className="grid w-9 shrink-0 place-items-center text-[var(--text-muted)]">
      <Icon className="size-5" />
    </span>
  );
}

/**
 * Chat's row tile (`apps/mobile/src/components/chat-tile.tsx`): the vibrant fill with
 * a white glyph and, when chats wait for a reply, the glowing dot with the figure.
 */
export function ChatTile({ count, pulseKey }: Readonly<{ count: number; pulseKey: number }>) {
  return (
    // Same 36 px column as the other rows' glyphs, so titles align; the dot sits on the tile's corner, clear of the text.
    <span aria-hidden className="grid w-9 shrink-0 place-items-center">
      <span className="chat-fill relative grid size-7 place-items-center rounded-[var(--radius-sm)]">
        <MessagesSquare className="size-4" />
        {count > 0 ? <ChatDot className="absolute -top-2 -right-2" count={count} halo="var(--surface)" pulseKey={pulseKey} /> : null}
      </span>
    </span>
  );
}

/** Lista agrupada de filas que navegan: el patrón de ajustes de iOS. */
export function RowGroup({ children }: Readonly<{ children: ReactNode[] }>) {
  const items = children.filter(Boolean);
  return (
    <ListCard>
      {items.map((child, index) => (
        <div key={index}>
          {index > 0 ? <Divider /> : null}
          {child}
        </div>
      ))}
    </ListCard>
  );
}

export function initialsOf(name: string | undefined, email: string | undefined): string {
  const source = name?.trim() || email?.split('@')[0] || '';
  const parts = source.split(/[\s._-]+/u).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '·';
}

/** «Compartir mi perfil»: hoja nativa del navegador o, si no hay, copiar el enlace. */
export async function shareProfile(userId: string, rank: string, stat: string) {
  const url = `${window.location.origin}/perfil/${userId}`;
  const text = `Rango ${rank} · ${stat}. Entrena conmigo:`;
  if (navigator.share) {
    await navigator.share({ title: 'REPP', text, url }).catch(() => undefined);
    return;
  }
  await navigator.clipboard.writeText(`${text} ${url}`);
  notify.success('Enlace copiado.');
}
