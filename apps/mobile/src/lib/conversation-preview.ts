/** Icon names are Ionicons glyphs; kept as plain strings so this module stays runtime-free. */
export type ConversationPreview = {
  /** Glyph shown before the text, or `null` for plain text. */
  icon: string | null;
  /** «Tú: » prefix when I sent the last message. */
  prefix: string | null;
  text: string;
  /** Muted/italic tone for placeholders and system rows. */
  subdued: boolean;
};

type PreviewInput = {
  lastMessage: string | null;
  lastMessageType?: string | null;
  lastMessageFromMe?: boolean;
  lastMessageAt: string | null;
  systemKind?: string | null;
};

/**
 * Read-only system chats explain what they are until their first message:
 * «sin mensajes» next to a pinned chat you can't write in reads like a bug.
 */
const EMPTY_SYSTEM_PREVIEW: Record<string, string> = {
  CORPORATE: 'Novedades y avisos de GymSheet.',
  TENANT_ADMIN: 'Avisos de la administración de tu gimnasio.',
};

const ICON_BY_TYPE: Record<string, string> = {
  audio: 'mic',
  image: 'camera',
  video: 'videocam',
  location: 'location',
  sticker: 'happy',
  deleted: 'ban',
  system: 'barbell',
};

export const EMPTY_CONVERSATION_PREVIEW = 'Todavía sin mensajes.';
/** Shown when the server reports a message but no text (e.g. an older backend and a voice note). */
export const UNKNOWN_MESSAGE_PREVIEW = 'Mensaje';

/**
 * Builds the chat-list preview. A conversation with `lastMessageAt` is never
 * «sin mensajes»: that label lied whenever the last message had no text.
 */
export function conversationPreview(input: PreviewInput): ConversationPreview {
  if (!input.lastMessageAt) {
    const system = input.systemKind ? EMPTY_SYSTEM_PREVIEW[input.systemKind] : undefined;
    return { icon: null, prefix: null, text: system ?? EMPTY_CONVERSATION_PREVIEW, subdued: true };
  }
  const type = input.lastMessageType ?? null;
  const text = input.lastMessage?.trim() || UNKNOWN_MESSAGE_PREVIEW;
  const isSystem = type === 'system' || type === 'deleted';
  return {
    icon: type ? (ICON_BY_TYPE[type] ?? null) : null,
    prefix: input.lastMessageFromMe && !isSystem ? 'Tú: ' : null,
    text,
    subdued: isSystem,
  };
}
