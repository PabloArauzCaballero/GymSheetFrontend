/**
 * Contracts for the centralized user-communication engine.
 *
 * These types are provider- and framework-agnostic: nothing here imports React,
 * React Native, sonner or Radix. Each client supplies an adapter (see
 * {@link ToastAdapter}) that translates them into a concrete visual surface.
 */

export type NotificationSeverity = 'success' | 'info' | 'warning' | 'error' | 'danger';

export type NotificationPresentation = 'toast' | 'modal';

/** Milliseconds until auto-dismiss, or `'persistent'` to keep it on screen. */
export type NotificationDuration = number | 'persistent';

export interface NotificationRequest {
  /** Stable id, used to update/dismiss and to prevent duplicates. */
  id?: string | number;
  severity: NotificationSeverity;
  /** Optional bold heading; when omitted the message is the whole toast. */
  title?: string;
  message: string;
  description?: string;
  duration?: NotificationDuration;
  dismissible?: boolean;
  /** Explicit key overrides the derived one (severity + message). */
  deduplicationKey?: string;
  /** Correlates a UI notification with an API request for telemetry. */
  correlationId?: string;
  action?: NotificationAction;
}

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

/**
 * Boundary between the engine and the visual toast provider. Swapping libraries
 * (sonner → notistack on web) or renderers (the built-in native toast host on
 * mobile) means reimplementing only this interface; no feature code imports the
 * provider directly.
 */
export interface ToastAdapter {
  show(request: NotificationRequest): string | number;
  dismiss(id?: string | number): void;
}

/** What a mutation should show at each phase of a promise. */
export interface PromiseMessages<T> {
  loading: string;
  success: string | ((value: T) => string);
  /** When omitted, the engine maps the thrown error to a friendly message. */
  error?: string | ((error: unknown) => string);
}

export interface ConfirmationRequest {
  title: string;
  message: string;
  description?: string;
  severity?: Extract<NotificationSeverity, 'warning' | 'danger' | 'info'>;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Escape / overlay / cancel are allowed unless a critical op is running. */
  dismissible?: boolean;
}

export interface ConfirmDeleteRequest {
  /** Entity type in Spanish, e.g. "serie", "sala", "credencial". */
  entity: string;
  /** Human name/description of the specific record being removed. */
  name?: string;
  /** Extra consequence copy appended below the default line. */
  message?: string;
  confirmLabel?: string;
}

/**
 * Confirmations return an explicit outcome. Closing the dialog is NOT the same
 * as cancelling — callers can tell "clicked Cancel" from "pressed Escape" (web)
 * or "tapped outside / Android back" (mobile).
 */
export interface ConfirmationResult {
  confirmed: boolean;
  action: 'confirm' | 'cancel' | 'dismiss';
}

/** Friendly, user-safe view of an error plus technical detail for logs. */
export interface ResolvedError {
  title: string;
  /** Never contains stack traces, SQL, tokens or internal paths. */
  message: string;
  /** Machine code for telemetry (the ApiError kind or HTTP status). */
  code?: string;
  requestId?: string;
  retryable: boolean;
}
