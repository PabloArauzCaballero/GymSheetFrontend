'use client';

import { Check, MoreVertical, Pencil, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { presenceLabel } from '@/features/chat/lib/chat-time';
import type { ChatSocketConnectionState } from '@/features/chat/hooks/use-chat-socket';
import type { ConversationSummary } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { PersonAvatar } from '@/shared/components/media/person-avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { chatService } from '@/features/chat/services/chat-service';
import { CreateTrainingInviteDialog } from '@/features/training-invitations/components/create-training-invite-dialog';

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
  const [selectingConversations, setSelectingConversations] = useState(false);
  const [selectedConversationIds, setSelectedConversationIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const conversations = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: chatService.listConversations,
  });
  const receiptSettings = useQuery({
    queryKey: ['chat', 'read-receipts', conversation?.conversationId],
    queryFn: () => chatService.getReadReceiptSettings(conversation?.conversationId),
    enabled: Boolean(conversation?.conversationId),
  });
  const updateReceiptSettings = useMutation({
    mutationFn: chatService.updateReadReceiptSettings,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['chat', 'read-receipts'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations }),
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] }),
      ]);
    },
    onError: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chat', 'read-receipts'] });
    },
  });
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
      {conversation?.systemKind === null && conversation.canWrite ? (
        <CreateTrainingInviteDialog
          recipientId={conversation.otherUserId}
          recipientName={conversation.otherUserName}
        />
      ) : null}
      <details className="group relative">
        <summary
          aria-label="Más opciones de conversación"
          className="grid size-10 cursor-pointer list-none place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-low)] hover:text-[var(--text)] [&::-webkit-details-marker]:hidden"
        >
          <MoreVertical aria-hidden className="size-5" />
        </summary>
        <div className="absolute right-0 top-12 z-20 grid min-w-64 gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-2 shadow-xl">
          <p className="px-3 py-2 text-xs font-semibold text-[var(--text-muted)]">Confirmación de lectura</p>
          <button
            className="rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--surface-low)] disabled:opacity-50"
            disabled={!conversation || !receiptSettings.data || updateReceiptSettings.isPending}
            onClick={() => {
              if (!conversation || !receiptSettings.data) return;
              updateReceiptSettings.mutate({
                scope: 'CONVERSATION',
                conversationId: conversation.conversationId,
                enabled: !receiptSettings.data.enabled,
                expectedVersion: receiptSettings.data.version,
              });
            }}
            type="button"
          >
            {receiptSettings.data?.enabled ? 'Desactivar solo en este chat' : 'Activar solo en este chat'}
          </button>
          <button
            className="rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--surface-low)] disabled:opacity-50"
            disabled={!conversations.data?.length || !receiptSettings.data}
            onClick={() => {
              setSelectedConversationIds(conversation ? [conversation.conversationId] : []);
              setSelectingConversations((value) => !value);
            }}
            type="button"
          >
            {selectingConversations ? 'Ocultar selección' : 'Elegir conversaciones…'}
          </button>
          {selectingConversations ? (
            <div className="grid max-h-56 gap-1 overflow-y-auto border-y border-[var(--border-subtle)] py-2" aria-label="Conversaciones para configurar visto">
              {(conversations.data ?? []).filter((item) => item.systemKind === null && item.canWrite).map((item) => {
                const selected = selectedConversationIds.includes(item.conversationId);
                return (
                  <label key={item.conversationId} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--surface-low)]">
                    <input
                      checked={selected}
                      onChange={() => setSelectedConversationIds((current) => selected
                        ? current.filter((id) => id !== item.conversationId)
                        : current.length < 100 ? [...current, item.conversationId] : current)}
                      type="checkbox"
                    />
                    <span className="truncate">{item.nickname ?? item.otherUserName}</span>
                  </label>
                );
              })}
              <div className="flex gap-2 px-3 pt-1">
                <button
                  className="rounded-lg bg-[var(--surface-low)] px-3 py-2 text-left text-xs disabled:opacity-50"
                  disabled={!receiptSettings.data || !selectedConversationIds.length || updateReceiptSettings.isPending}
                  onClick={() => updateReceiptSettings.mutate({ scope: 'SELECTED', conversationIds: selectedConversationIds, enabled: false, expectedVersion: receiptSettings.data!.version })}
                  type="button"
                >Desactivar seleccionados</button>
                <button
                  className="rounded-lg bg-[var(--surface-low)] px-3 py-2 text-left text-xs disabled:opacity-50"
                  disabled={!receiptSettings.data || !selectedConversationIds.length || updateReceiptSettings.isPending}
                  onClick={() => updateReceiptSettings.mutate({ scope: 'SELECTED', conversationIds: selectedConversationIds, enabled: true, expectedVersion: receiptSettings.data!.version })}
                  type="button"
                >Activar seleccionados</button>
              </div>
            </div>
          ) : null}
          <button
            className="rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--surface-low)] disabled:opacity-50"
            disabled={!receiptSettings.data || updateReceiptSettings.isPending}
            onClick={() => {
              if (!receiptSettings.data) return;
              updateReceiptSettings.mutate({
                scope: 'ALL',
                enabled: !receiptSettings.data.defaultEnabled,
                expectedVersion: receiptSettings.data.version,
              });
            }}
            type="button"
          >
            {receiptSettings.data?.defaultEnabled ? 'Desactivar en todos los chats' : 'Activar en todos los chats'}
          </button>
          {updateReceiptSettings.isError ? (
            <p className="px-3 py-2 text-xs text-[var(--danger-text)]" role="alert">
              No se pudo guardar. Cierra y vuelve a abrir el menú para actualizar el estado.
            </p>
          ) : null}
        </div>
      </details>
    </header>
  );
}
