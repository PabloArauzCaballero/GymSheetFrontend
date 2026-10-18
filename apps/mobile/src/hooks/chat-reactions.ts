import type { Message, MessageReaction } from '@gymsheet/schemas';

/** La barra rápida al mantener pulsado; el «+» abre el teclado de emojis entero. */
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '💪'] as const;

export type ReactionSummary = { emoji: string; count: number; mine: boolean };

/** Agrupa por emoji en el orden en que llegaron: «❤️ 2», «👍». */
export function summarizeReactions(
  reactions: readonly MessageReaction[] | undefined,
  currentUserId: string | undefined,
): ReactionSummary[] {
  const byEmoji = new Map<string, ReactionSummary>();
  for (const reaction of reactions ?? []) {
    const entry = byEmoji.get(reaction.emoji) ?? { emoji: reaction.emoji, count: 0, mine: false };
    entry.count += 1;
    if (reaction.userId === currentUserId) entry.mine = true;
    byEmoji.set(reaction.emoji, entry);
  }
  return [...byEmoji.values()];
}

export function myReaction(
  reactions: readonly MessageReaction[] | undefined,
  currentUserId: string | undefined,
): string | null {
  return reactions?.find((reaction) => reaction.userId === currentUserId)?.emoji ?? null;
}

/** Una por persona: poner otra la reemplaza; `null` la quita. Para pintar al instante antes del servidor. */
export function withReaction(
  reactions: readonly MessageReaction[] | undefined,
  userId: string,
  emoji: string | null,
): MessageReaction[] {
  const others = (reactions ?? []).filter((reaction) => reaction.userId !== userId);
  return emoji ? [...others, { userId, emoji }] : others;
}

/** Elegir la reacción que ya tenías la quita, como en WhatsApp. */
export function nextReaction(current: string | null, chosen: string): string | null {
  return current === chosen ? null : chosen;
}

/** Aplica el evento `message:reaction` (o la respuesta del PUT) a una lista; si no está, la deja igual. */
export function applyReactions<T extends Message>(
  messages: readonly T[],
  update: { messageId: string; reactions: MessageReaction[] },
): T[] {
  let changed = false;
  const next = messages.map((message) => {
    if (message.id !== update.messageId || message.type === 'system') return message;
    changed = true;
    return { ...message, reactions: update.reactions };
  });
  return changed ? next : (messages as T[]);
}

export function reactionsAccessibilityLabel(summary: readonly ReactionSummary[]): string {
  if (!summary.length) return '';
  const parts = summary.map((entry) => (entry.count > 1 ? `${entry.emoji} ${entry.count}` : entry.emoji));
  const mine = summary.find((entry) => entry.mine);
  return `Reacciones: ${parts.join(', ')}${mine ? `. Tu reacción: ${mine.emoji}` : ''}`;
}
