'use client';

import { Check, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { presenceLabel } from '@/features/chat/lib/chat-time';
import type { ChatSocketConnectionState } from '@/features/chat/hooks/use-chat-socket';
import type { ConversationSummary } from '@/shared/api/schemas';
import { PersonAvatar } from '@/shared/components/media/person-avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

/**
 * Quién está al otro lado.
 *
 * Foto, si está conectado ahora mismo y cuándo se le vio por última vez — los
 * tres datos vienen en `ConversationSummary` y se refrescan por socket. El hilo
 * de la web no los pintaba: abría una conversación titulada con un nombre y
 * nada más.
 *
 * El apodo se edita aquí y no en un ajuste aparte porque sólo tiene sentido
 * mirando a la persona a la que se le pone. Es privado de quien lo escribe: el
 * backend no se lo enseña a nadie más.
 */
export function ThreadHeader({
  connectionState,
  conversation,
  onSaveNickname,
  otherLastSeenAt,
  otherOnline,
  savingNickname,
}: Readonly<{
  connectionState: ChatSocketConnectionState;
  conversation: ConversationSummary | undefined;
  onSaveNickname: (nickname: string | null) => void;
  otherLastSeenAt: string | null;
  otherOnline: boolean;
  savingNickname: boolean;
}>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const displayName = conversation?.nickname ?? conversation?.otherUserName ?? 'Conversación';

  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-[var(--border-subtle)] pb-5">
      <span className="relative shrink-0">
        <PersonAvatar
          name={conversation?.otherUserName ?? 'Socio'}
          photoUrl={conversation?.otherUserPhotoUrl ?? null}
          size="md"
        />
        {otherOnline ? (
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-[var(--background)] bg-[var(--success-text)]"
          />
        ) : null}
      </span>

      <div className="grid min-w-0 flex-1 gap-1">
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              aria-label="Apodo para esta conversación"
              autoFocus
              maxLength={40}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={conversation?.otherUserName ?? 'Apodo'}
              value={draft}
            />
            <Button
              aria-label="Guardar el apodo"
              loading={savingNickname}
              onClick={() => {
                const trimmed = draft.trim();
                // Vaciar el campo borra el apodo y devuelve el nombre real: es
                // la única forma de deshacerlo, así que no hay un botón aparte.
                onSaveNickname(trimmed.length ? trimmed : null);
                setEditing(false);
              }}
              size="icon"
              variant="primary"
            >
              <Check aria-hidden className="size-4" />
            </Button>
            <Button
              aria-label="Cancelar"
              onClick={() => setEditing(false)}
              size="icon"
              variant="ghost"
            >
              <X aria-hidden className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-[-0.02em]">{displayName}</h1>
            <button
              aria-label="Poner un apodo a esta conversación"
              className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-low)] hover:text-[var(--text)]"
              onClick={() => {
                setDraft(conversation?.nickname ?? '');
                setEditing(true);
              }}
              type="button"
            >
              <Pencil aria-hidden className="size-3.5" />
            </button>
          </div>
        )}
        <p className="text-xs text-[var(--text-muted)]">
          {presenceLabel(otherOnline, otherLastSeenAt)}
        </p>
      </div>

      <Badge tone={connectionState === 'connected' ? 'success' : 'neutral'}>
        {connectionState === 'connected' ? 'En vivo' : 'Conectando…'}
      </Badge>
    </header>
  );
}
