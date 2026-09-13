'use client';

import { Building2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { ConversationSummary } from '@/shared/api/schemas';
import { PersonAvatar } from '@/shared/components/media/person-avatar';
import { chatTimestampLabel } from '@/features/chat/lib/chat-time';

const SYSTEM_ICON = {
  CORPORATE: Building2,
  TENANT_ADMIN: ShieldCheck,
} as const;

const SYSTEM_LABEL = {
  CORPORATE: 'Corporativo',
  TENANT_ADMIN: 'Admin del gimnasio',
} as const;

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
 */
export function ConversationRow({
  conversation,
}: Readonly<{ conversation: ConversationSummary }>) {
  const systemKind = conversation.systemKind;
  const SystemIcon = systemKind ? SYSTEM_ICON[systemKind] : null;

  return (
    <li>
      <Link
        className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-lowest)] p-4 transition-colors duration-[var(--dur-2)] hover:border-[var(--border)]"
        href={`/chat/${conversation.conversationId}`}
      >
        <span className="relative shrink-0">
          <PersonAvatar
            name={conversation.otherUserName}
            photoUrl={conversation.otherUserPhotoUrl}
            size="md"
          />
          {conversation.otherUserOnline ? (
            <span
              aria-hidden
              className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-[var(--surface-lowest)] bg-[var(--success-text)]"
              title="En línea"
            />
          ) : null}
          {SystemIcon && systemKind ? (
            <span
              aria-hidden
              className="absolute -left-1 -top-1 grid size-5 place-items-center rounded-full border-2 border-[var(--surface-lowest)] bg-[var(--volt)] text-[var(--accent-contrast)]"
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
            {conversation.otherUserOnline ? (
              <span className="sr-only">En línea</span>
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
