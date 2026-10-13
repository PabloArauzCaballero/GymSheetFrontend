export type ChatHistoryRecoveryState<Message, Media> = {
  history: Message[];
  olderMessages: Message[];
  liveMessages: Message[];
  revealedMedia: Record<string, Media>;
  viewerUri: string | null;
  unavailable: boolean;
};

export function isChatHistoryNotFound(error: unknown): boolean {
  return hasHttpStatus(error, 404);
}

export function cachedMessagesWhileAccessPending<Message>(
  messages: Message[],
  accessPending: boolean,
): Message[] {
  return accessPending ? [] : messages;
}

export function canWriteWhileHistoryAccessPending(canWrite: boolean, accessPending: boolean): boolean {
  return canWrite && !accessPending;
}

export function viewerUriWhileHistoryAccessPending(uri: string | null, accessPending: boolean): string | null {
  return accessPending ? null : uri;
}

export function historyCacheReplacementForError(error: unknown): [] | null {
  return isChatHistoryNotFound(error) ? [] : null;
}

function hasHttpStatus(error: unknown, status: number): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === status;
}

/** Hide the cached conversation only when the server confirms it no longer exists. */
export function recoverFromHistoryError<Message, Media>(
  state: ChatHistoryRecoveryState<Message, Media>,
  error: unknown,
): ChatHistoryRecoveryState<Message, Media> {
  if (!isChatHistoryNotFound(error)) return state;
  return {
    history: [],
    olderMessages: [],
    liveMessages: [],
    revealedMedia: {},
    viewerUri: null,
    unavailable: true,
  };
}
