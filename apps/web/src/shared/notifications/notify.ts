import { sonnerAdapter, type ToastAdapter } from './adapters/toast-adapter';
import { Deduplicator } from './core/dedupe';
import { resolveError } from './core/messages';
import { defaultPolicy, type NotificationPolicy } from './core/policy';
import { reportError } from './core/telemetry';
import type {
  NotificationRequest,
  NotificationSeverity,
  PromiseMessages,
} from './core/types';

/** Sugar input: a bare message string or a partial request without severity. */
type NotifyInput = string | Omit<NotificationRequest, 'severity'>;

function normalize(input: NotifyInput): Omit<NotificationRequest, 'severity'> {
  return typeof input === 'string' ? { message: input } : input;
}

/**
 * The single notification surface for the web app. Feature code depends on this
 * object, never on the toast provider. Deduplication, policy and error mapping
 * all live behind it.
 */
export class NotificationEngine {
  private readonly dedupe: Deduplicator;

  constructor(
    private readonly adapter: ToastAdapter = sonnerAdapter,
    private readonly policy: NotificationPolicy = defaultPolicy,
  ) {
    this.dedupe = new Deduplicator(policy.deduplicationWindowMs);
  }

  private emit(severity: NotificationSeverity, input: NotifyInput): string | number | undefined {
    const request: NotificationRequest = { severity, ...normalize(input) };
    request.duration ??= this.durationFor(severity);
    if (this.policy.suppressDuplicateErrors && !this.dedupe.shouldShow(request)) {
      return undefined;
    }
    return this.adapter.show(request);
  }

  private durationFor(severity: NotificationSeverity): number {
    switch (severity) {
      case 'success':
        return this.policy.durations.success;
      case 'warning':
        return this.policy.durations.warning;
      case 'error':
      case 'danger':
        return this.policy.durations.error;
      default:
        return this.policy.durations.info;
    }
  }

  success(input: NotifyInput) {
    return this.emit('success', input);
  }

  info(input: NotifyInput) {
    return this.emit('info', input);
  }

  warning(input: NotifyInput) {
    return this.emit('warning', input);
  }

  /**
   * Accepts a thrown value (mapped to friendly copy + telemetry) or an explicit
   * message/request. `toast.error(error.message)` call-sites become
   * `notify.error(error)` and stop leaking technical text.
   */
  error(errorOrInput: unknown, options?: Omit<NotificationRequest, 'severity' | 'message'>) {
    if (typeof errorOrInput === 'string') {
      return this.emit('error', { message: errorOrInput, ...options });
    }
    if (
      errorOrInput !== null &&
      typeof errorOrInput === 'object' &&
      'message' in errorOrInput &&
      !(errorOrInput instanceof Error)
    ) {
      // Already a NotificationRequest-shaped object.
      return this.emit('error', errorOrInput as Omit<NotificationRequest, 'severity'>);
    }
    const resolved = resolveError(errorOrInput);
    reportError(resolved, options?.correlationId);
    return this.emit('error', {
      title: resolved.title,
      message: resolved.message,
      ...options,
    });
  }

  /** Persistent, spinner-less loading toast. Returns an id to update/dismiss. */
  loading(input: NotifyInput) {
    const request = normalize(input);
    return this.adapter.show({ severity: 'info', duration: 'persistent', ...request });
  }

  dismiss(id?: string | number) {
    this.adapter.dismiss(id);
  }

  /**
   * Ties a toast to the real lifecycle of an async operation: loading →
   * success/error. Success copy only shows once the promise resolves, so we
   * never declare success before the backend confirms.
   */
  async promise<T>(operation: Promise<T>, messages: PromiseMessages<T>): Promise<T> {
    const id = this.loading(messages.loading);
    try {
      const value = await operation;
      const text =
        typeof messages.success === 'function' ? messages.success(value) : messages.success;
      this.adapter.show({ severity: 'success', id, message: text, duration: this.durationFor('success') });
      return value;
    } catch (error) {
      if (messages.error) {
        const text = typeof messages.error === 'function' ? messages.error(error) : messages.error;
        this.adapter.show({ severity: 'error', id, message: text, duration: this.durationFor('error') });
      } else {
        const resolved = resolveError(error);
        reportError(resolved);
        this.adapter.show({
          severity: 'error',
          id,
          title: resolved.title,
          message: resolved.message,
          duration: this.durationFor('error'),
        });
      }
      throw error;
    }
  }
}

/** Canonical singleton used across the app. */
export const notify = new NotificationEngine();
