import type { NotificationAction, NotificationRequest, NotificationSeverity, ToastAdapter } from './types';

/** A toast currently on screen. Renderers read this shape and nothing else. */
export interface ToastItem {
  readonly id: string | number;
  readonly severity: NotificationSeverity;
  readonly title?: string;
  readonly message: string;
  readonly description?: string;
  readonly dismissible: boolean;
  readonly action?: NotificationAction;
  /** `true` while an operation is in flight (persistent duration). */
  readonly pending: boolean;
}

export interface ToastQueueOptions {
  /** Older toasts beyond this count are dropped; phones have little room. */
  maxVisible?: number;
}

const EMPTY: readonly ToastItem[] = [];

/**
 * Headless toast surface for clients with no toast library of their own — the
 * React Native app renders it, the web app uses sonner instead. It owns the
 * visible list and the auto-dismiss timers; the renderer only paints.
 *
 * Implements {@link ToastAdapter}, so it plugs straight into `NotificationEngine`.
 */
export class ToastQueue implements ToastAdapter {
  private items: readonly ToastItem[] = EMPTY;
  private readonly listeners = new Set<() => void>();
  private readonly timers = new Map<string | number, ReturnType<typeof setTimeout>>();
  private readonly maxVisible: number;
  private counter = 0;

  constructor(options: ToastQueueOptions = {}) {
    this.maxVisible = options.maxVisible ?? 3;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Stable reference between mutations, as `useSyncExternalStore` requires. */
  getSnapshot = (): readonly ToastItem[] => this.items;

  getServerSnapshot = (): readonly ToastItem[] => EMPTY;

  /**
   * Adds a toast, or replaces the one carrying the same id — that is how a
   * `loading` toast becomes its own success/error result instead of stacking.
   */
  show(request: NotificationRequest): string | number {
    const id = request.id ?? `toast-${++this.counter}`;
    const item: ToastItem = {
      id,
      severity: request.severity,
      title: request.title,
      message: request.message,
      description: request.description,
      dismissible: request.dismissible ?? true,
      action: request.action,
      pending: request.duration === 'persistent',
    };

    const existing = this.items.findIndex((current) => current.id === id);
    const next = existing >= 0 ? [...this.items] : [...this.items, item];
    if (existing >= 0) next[existing] = item;
    this.items = next.length > this.maxVisible ? next.slice(next.length - this.maxVisible) : next;

    // Any toast dropped by the cap must not keep a timer alive.
    for (const [timerId, timer] of this.timers) {
      if (!this.items.some((current) => current.id === timerId)) {
        clearTimeout(timer);
        this.timers.delete(timerId);
      }
    }

    this.scheduleDismiss(id, request.duration);
    this.emit();
    return id;
  }

  /** Dismisses one toast, or all of them when called without an id. */
  dismiss(id?: string | number): void {
    if (id === undefined) {
      for (const timer of this.timers.values()) clearTimeout(timer);
      this.timers.clear();
      if (this.items.length === 0) return;
      this.items = EMPTY;
      this.emit();
      return;
    }
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    const next = this.items.filter((current) => current.id !== id);
    if (next.length === this.items.length) return;
    this.items = next;
    this.emit();
  }

  private scheduleDismiss(id: string | number, duration: NotificationRequest['duration']): void {
    const previous = this.timers.get(id);
    if (previous !== undefined) {
      clearTimeout(previous);
      this.timers.delete(id);
    }
    if (duration === 'persistent' || duration === undefined || duration <= 0) return;
    this.timers.set(
      id,
      setTimeout(() => {
        this.timers.delete(id);
        this.dismiss(id);
      }, duration),
    );
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
