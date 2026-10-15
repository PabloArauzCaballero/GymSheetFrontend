type ReceiptUpdateForRelevance = {
  userId: string;
  settingsChanged?: boolean;
};

export type ReceiptCursor = {
  userId: string;
  deliveredAt?: string;
  readAt?: string;
  readFrom?: string | null;
  settingsChanged?: boolean;
};

export type ReceiptPolicyState = {
  cutoffAt: string | null;
  awaitingFreshRead: boolean;
  cursor: ReceiptCursor | null;
};

export function createReceiptPolicyState(): ReceiptPolicyState {
  return {
    cutoffAt: null,
    awaitingFreshRead: false,
    cursor: null,
  };
}

function laterTimestamp(first: string | null | undefined, second: string | null | undefined): string | null {
  if (!first) return second ?? null;
  if (!second) return first;
  const firstTime = Date.parse(first);
  const secondTime = Date.parse(second);
  if (!Number.isFinite(firstTime)) return Number.isFinite(secondTime) ? second : null;
  if (!Number.isFinite(secondTime)) return first;
  return firstTime >= secondTime ? first : second;
}

function isAtOrAfter(value: string, cutoff: string | null): boolean {
  if (!cutoff) return Number.isFinite(Date.parse(value));
  const valueTime = Date.parse(value);
  const cutoffTime = Date.parse(cutoff);
  return Number.isFinite(valueTime) && Number.isFinite(cutoffTime) && valueTime >= cutoffTime;
}

export function beginReceiptSettingsChange(
  state: ReceiptPolicyState,
  userId: string,
): ReceiptPolicyState {
  return {
    cutoffAt: null,
    awaitingFreshRead: true,
    cursor: { userId, settingsChanged: true },
  };
}

export function applyReceiptUpdate(
  state: ReceiptPolicyState,
  incoming: ReceiptCursor,
  receiptsEnabled: boolean | undefined,
): ReceiptPolicyState {
  if (state.awaitingFreshRead) {
    if (incoming.deliveredAt) {
      return {
        ...state,
        cursor: {
          userId: state.cursor?.userId ?? incoming.userId,
          deliveredAt: incoming.deliveredAt,
          settingsChanged: true,
        },
      };
    }
    // While the barrier is active, only a fresh server summary can reconcile a
    // read cursor. A socket event may have been queued before settings changed.
    return state;
  }

  if (incoming.readAt && receiptsEnabled === false) {
    return {
      ...state,
      cursor: {
        userId: incoming.userId,
        ...(incoming.deliveredAt ? { deliveredAt: incoming.deliveredAt } : {}),
        settingsChanged: false,
      },
    };
  }

  return {
    ...state,
    cursor: {
      ...state.cursor,
      ...incoming,
      readAt: incoming.readAt ?? state.cursor?.readAt,
      readFrom: laterTimestamp(incoming.readFrom, state.cursor?.readFrom ?? state.cutoffAt),
      deliveredAt: incoming.deliveredAt ?? state.cursor?.deliveredAt,
    },
  };
}

export function confirmReceiptSettingsChange(
  state: ReceiptPolicyState,
  receiptsEnabled: boolean | undefined,
  serverCutoff: string | null | undefined,
  serverReadAt: string | null | undefined,
  sourceIsFresh: boolean,
  cursorUserId: string,
): ReceiptPolicyState {
  if (!state.awaitingFreshRead) return state;
  if (!sourceIsFresh) return state;
  const cutoffAt = serverCutoff ?? null;
  if (receiptsEnabled !== true || !serverReadAt || !isAtOrAfter(serverReadAt, cutoffAt)) {
    return { ...state, cutoffAt };
  }
  return {
    ...state,
    cutoffAt,
    awaitingFreshRead: false,
    cursor: {
      userId: cursorUserId,
      readAt: serverReadAt,
      readFrom: cutoffAt,
      settingsChanged: false,
    },
  };
}

export function latestReceiptCutoff(...cutoffs: Array<string | null | undefined>): string | null {
  return cutoffs.reduce<string | null>((latest, cutoff) => laterTimestamp(latest, cutoff), null);
}

export function visibleReceiptReadAt(
  state: ReceiptPolicyState,
  receiptsEnabled: boolean | undefined,
  restReadAt: string | null | undefined,
): string | null {
  if (state.awaitingFreshRead || receiptsEnabled === false) return null;
  return state.cursor?.readAt ?? restReadAt ?? null;
}

export function isRelevantReceiptUpdate(
  receipt: ReceiptUpdateForRelevance,
  currentUserId: string | undefined,
  otherUserId: string | undefined,
): boolean {
  if (receipt.userId === otherUserId) return true;
  return Boolean(receipt.settingsChanged && currentUserId && receipt.userId === currentUserId);
}

export function receiptSettingsAffectConversation(
  input: { scope: 'ALL' | 'CONVERSATION' | 'SELECTED'; conversationId?: string; conversationIds?: string[] },
  conversationId: string,
): boolean {
  if (input.scope === 'ALL') return true;
  if (input.scope === 'CONVERSATION') return input.conversationId === conversationId;
  return input.conversationIds?.includes(conversationId) ?? false;
}
