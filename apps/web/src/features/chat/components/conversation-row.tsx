'use client';

import { conversationControls, type ChatViewer } from '@gymsheet/domain';
import { Building2 } from 'lucide-react';
import Link from 'next/link';
import type { ConversationSummary } from '@/shared/api/schemas';
import { PersonAvatar } from '@/shared/components/media/person-avatar';
import { chatTimestampLabel } from '@/features/chat/lib/chat-time';

const SYSTEM_ICON = { CORPORATE: Building2 } as const;

const SYSTEM_LABEL = { CORPORATE: 'Corporativo' } as const;

/**
 * Una fila de la lista de chats.
 *
 * Foto grande, punto verde si la otra persona está conectada ahora mismo, y la
 * hora del último mensaje donde el ojo ya espera encontrarla. El contrato traía
 * los tres datos —`otherUserPhotoUrl`, `otherUserOnline`, `nickname`— desde que
 * existe el chat; la web pintaba sólo el nombre y la fecha larga, así que dos
 * conversaciones sin abrir se veían exactamente igual.
 *
 * El apodo manda sobre el nombre real cuando existe: es privado de quien lo
 * puso y es como esa persona llama a la otra en su cabeza.
 *
 * Franja 8f: a person sees a chat with a business marked «Negocio»; the
 * business inbox reuses the row (`viewer="business"`, its own thread route)
 * without presence, which the backend never sends to a business. A chat
 * whose business closed its account reads «Negocio cerrado» (ADR-0028).
 */
export function ConversationRow({
  conversation,
  viewer = 'person',
  href = `/chat/${conversation.conversationId}`,
}: Readonly<{ conversation: ConversationSummary; viewer?: ChatViewer; href?: string }>) {
  const systemKind = conversation.systemKind;
  const SystemIcon = systemKind ? SYSTEM_ICON[systemKind] : null;
  const controls = conversationControls(conversation, viewer);
  const online = controls.presence && conversation.otherUserOnline;

  return (
    <li>
      <Link
        className="tap flex min-h-16 items-center gap-3 rounded-[var(--radius-md)] px-1 py-3 transition-colors duration-[var(--dur-2)] hover:bg-[var(--surface)]"
        href={href}
      >
        <span className="relative shrink-0">
          <PersonAvatar
            name={conversation.otherUserName}
            photoUrl={conversation.otherUserPhotoUrl}
            size="md"
          />
          {online ? (
            <span
              aria-hidden
              className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-[var(--surface-low)] bg-[var(--success-text)]"
              title="En línea"
            />
          ) : null}
          {SystemIcon && systemKind ? (
            <span
              aria-hidden
              className="absolute -left-1 -top-1 grid size-5 place-items-center rounded-full border-2 border-[var(--surface-low)] bg-[var(--volt)] text-[var(--accent-contrast)]"
              title={SYSTEM_LABEL[systemKind]}
            >
              <SystemIcon className="size-2.5" />
            </span>
          ) : null}
        </span>

        <span className="grid min-w-0 flex-1 gap-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold">
              {conversation.nickname ?? conversation.otherUserName}
            </span>
            {online ? <span className="sr-only">En línea</span> : null}
            {controls.badge ? (
              <span className="shrink-0 rounded-full bg-[var(--surface-high)] px-2 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
                {controls.badge}
              </span>
            ) : null}
          </span>
          <span className="truncate text-sm text-[var(--text-muted)]">
            {conversation.lastMessage ?? 'Todavía sin mensajes.'}
          </span>
        </span>

        <span className="shrink-0 text-xs text-[var(--text-muted)]">
          {chatTimestampLabel(conversation.lastMessageAt)}
        </span>
      </Link>
    </li>
  );
}
