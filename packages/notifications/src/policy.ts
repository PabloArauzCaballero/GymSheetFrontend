/**
 * Configurable rules deciding when a given surface must appear. Defaults follow
 * the UX rules in docs/notifications: confirm destructive/critical work, notify
 * the result of writes, never confirm trivial edits.
 */
export interface NotificationPolicy {
  /** Deletes and other irreversible actions must be confirmed first. */
  requireDeleteConfirmation: boolean;
  /** Critical edits (permissions, publish, production state) confirm first. */
  requireCriticalEditConfirmation: boolean;
  /** Successful mutations report a toast; reads do not. */
  notifySuccessfulMutations: boolean;
  /** Collapse repeated identical errors within the dedup window. */
  suppressDuplicateErrors: boolean;
  /** Dedup window in ms for repeated notifications. */
  deduplicationWindowMs: number;
  /** Default auto-close durations (ms) by outcome. */
  durations: {
    success: number;
    info: number;
    warning: number;
    error: number;
  };
}

export const defaultPolicy: NotificationPolicy = {
  requireDeleteConfirmation: true,
  requireCriticalEditConfirmation: true,
  notifySuccessfulMutations: true,
  suppressDuplicateErrors: true,
  deduplicationWindowMs: 4000,
  durations: {
    success: 3500,
    info: 5000,
    warning: 6000,
    error: 8000,
  },
};

/**
 * Touch surfaces read a toast while the thumb is still moving, and a phone
 * shows one toast at a time: durations are slightly longer than on web so a
 * result is not missed mid-scroll.
 */
export const nativePolicy: NotificationPolicy = {
  ...defaultPolicy,
  durations: {
    success: 4000,
    info: 5000,
    warning: 6500,
    error: 9000,
  },
};
