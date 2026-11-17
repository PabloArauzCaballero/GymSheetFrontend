/**
 * Chat between a person and a business (franja 8f, backend ADR-0023): which
 * controls a conversation allows on each side, and what a refused call says.
 * Read structurally (no transport types), shared by web and mobile.
 */
export type ChatConversationKind = 'DIRECT' | 'SYSTEM' | 'BUSINESS';
export type ChatViewer = 'person' | 'business';

/** New business chats a person may open in a rolling 24 h window (backend `BUSINESS_CONVERSATIONS_PER_DAY`). */
export const BUSINESS_CHATS_PER_DAY = 10;

/**
 * A business account has no socket (`/auth/socket-ticket` answers 403): its
 * open thread and its inbox refetch on this interval while visible. React
 * Query pauses interval refetches in the background.
 */
export const BUSINESS_CHAT_POLL_MS = { thread: 8_000, inbox: 20_000 } as const;

type ConversationShape = { kind?: ChatConversationKind | null; systemKind?: string | null; businessClosed?: boolean | null };

/** A server before franja 8f sends no `kind`: a system chat still says so with `systemKind`. */
export function conversationKindOf(conversation: ConversationShape): ChatConversationKind {
  if (conversation.kind) return conversation.kind;
  return conversation.systemKind ? 'SYSTEM' : 'DIRECT';
}

export type ConversationControls = {
  /** Socket (presence, typing, live events); otherwise polling. */
  realtime: boolean;
  /** Disappearing messages: refused in a BUSINESS chat (422), meaningless in REPP's chat. */
  disappearing: boolean;
  /** Sharing a location: refused in a BUSINESS chat (422). */
  location: boolean;
  /** «Entrenemos juntos»: only between two persons. */
  trainTogether: boolean;
  /** Per-chat read receipt settings (`/me/chat/read-receipts` is a person route). */
  receiptSettings: boolean;
  /** «Reportar mensaje»: persons report; a business account cannot (it blocks). */
  report: boolean;
  /** Forwarding needs the person's chat list; the business inbox has no forward picker. */
  forward: boolean;
  /** «Bloquear a esta persona»: the business side of a BUSINESS chat. */
  block: boolean;
  /** «Ver perfil»: the social profile of another person; never for a business viewer. */
  openProfile: boolean;
  /** Presence and last seen: a business never sees them (the backend sends none). */
  presence: boolean;
  /** The «Negocio» mark on the other side: a person talking to a business. */
  businessBadge: boolean;
  /** The business closed its account (ADR-0028): the chat is read-only for the person, no composer. */
  businessClosed: boolean;
  /** What the mark says: «Negocio», «Negocio cerrado», or nothing. */
  badge: string | null;
  /** The line shown in place of the composer when the chat cannot be written. */
  readOnlyNotice: string;
};

export function conversationControls(conversation: ConversationShape | undefined, viewer: ChatViewer): ConversationControls {
  const kind = conversation ? conversationKindOf(conversation) : 'DIRECT';
  const person = viewer === 'person';
  const direct = kind === 'DIRECT';
  const businessClosed = person && kind === 'BUSINESS' && conversation?.businessClosed === true;
  const businessBadge = person && kind === 'BUSINESS';
  return {
    realtime: person,
    disappearing: direct,
    location: kind !== 'BUSINESS',
    trainTogether: person && direct,
    receiptSettings: person,
    report: person,
    forward: person,
    block: !person && kind === 'BUSINESS',
    openProfile: person && direct,
    presence: person && kind !== 'BUSINESS',
    businessBadge,
    businessClosed,
    badge: businessClosed ? businessChatCopy.closed : businessBadge ? businessChatCopy.badge : null,
    readOnlyNotice: businessClosed ? businessChatCopy.closedNotice : businessChatCopy.readOnly,
  };
}

/** Where «Escribir» on a business profile or listing goes for each viewer. */
export type StartBusinessChatGate = 'hidden' | 'sign-in' | 'enabled';

export function startBusinessChatGate(viewer: 'anonymous' | ChatViewer): StartBusinessChatGate {
  if (viewer === 'business') return 'hidden';
  return viewer === 'anonymous' ? 'sign-in' : 'enabled';
}

export type BusinessChatFailure = {
  code: string | null;
  title: string;
  message: string;
  /** What the screen offers next: verify the email, or nothing (just the message). */
  next?: 'verify-email';
};

type ErrorShape = { code?: unknown; status?: unknown; message?: unknown };

export const businessChatCopy = {
  write: 'Escribir',
  writing: 'Abriendo chat…',
  signIn: 'Inicia sesión para escribir',
  badge: 'Negocio',
  closed: 'Negocio cerrado',
  closedNotice: 'Este negocio cerró su cuenta en REPP. Puedes leer la conversación, pero ya no recibe mensajes.',
  readOnly: 'Esta conversación es de solo lectura.',
  block: 'Bloquear a esta persona',
  blockTitle: '¿Bloquear a esta persona?',
  blockConsequence: 'Se cierra este chat y no podrá volver a escribirte. Esto no se deshace desde la app.',
  blockConfirm: 'Bloquear',
  blocked: 'Bloqueaste a esta persona. El chat se cerró.',
  inboxTitle: 'Mensajes',
  inboxSubtitle: 'Las personas te escriben desde tu perfil y tus publicaciones. Respóndeles aquí.',
  inboxEmpty: 'Todavía nadie te escribió',
  inboxEmptyHint: 'Cuando alguien te escriba desde tu perfil o una publicación, lo verás aquí.',
  noDisappearing: 'En el chat con un negocio los mensajes no se borran solos: quedan como constancia.',
} as const;

/** The title and message of a refused business-chat call; `null` code = not one of ours (show the server's text). */
export function businessChatFailure(error: unknown): BusinessChatFailure {
  const shape = (typeof error === 'object' && error !== null ? error : {}) as ErrorShape;
  const code = typeof shape.code === 'string' ? shape.code : null;
  const status = typeof shape.status === 'number' ? shape.status : null;
  const fail = (title: string, message: string, next?: BusinessChatFailure['next']): BusinessChatFailure => ({
    code,
    title,
    message,
    ...(next ? { next } : {}),
  });
  switch (code) {
    case 'BUSINESS_CHAT_BLOCKED':
      return fail('Este negocio no recibe tus mensajes', 'Si tienes un pedido en disputa, escríbele al equipo de REPP desde su chat.');
    case 'BUSINESS_CHAT_LIMIT':
      return fail(
        'Llegaste al límite de hoy',
        `Puedes escribir a ${BUSINESS_CHATS_PER_DAY} negocios nuevos cada 24 horas. Vuelve a intentarlo mañana; tus chats abiertos siguen funcionando.`,
      );
    case 'EMAIL_VERIFICATION_REQUIRED':
      return fail('Verifica tu correo', 'Confirma tu correo para escribirle a un negocio.', 'verify-email');
    case 'ACCOUNT_KIND_NOT_ALLOWED':
      return fail('Solo responde', 'Una cuenta de negocio no abre chats: responde a quien te escribe.');
    case 'BUSINESS_ACCOUNT_LOCKED':
      return fail('Tu negocio no puede enviar mensajes', 'Está suspendido o cerrado. Escríbele al equipo de REPP para resolverlo.');
    case 'BUSINESS_CHAT_NO_LOCATION':
      return fail('Sin ubicación', 'En el chat con un negocio no se comparte la ubicación.');
    case 'BUSINESS_CHAT_NO_DISAPPEARING':
      return fail('Sin mensajes temporales', businessChatCopy.noDisappearing);
    default:
      break;
  }
  if (status === 404) return fail('Este negocio no está disponible', 'Puede que haya pausado su perfil. Inténtalo más tarde.');
  if (status === 429) return fail('Espera un momento', 'Hiciste muchos intentos seguidos. Vuelve a intentarlo en un rato.');
  const serverText = typeof shape.message === 'string' && shape.message.length > 0 ? shape.message : 'Vuelve a intentarlo.';
  return { code, title: 'No pudimos abrir el chat', message: serverText };
}
