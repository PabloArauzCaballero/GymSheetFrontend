import type {
  ConfirmationRequest,
  ConfirmationResult,
  ConfirmDeleteRequest,
} from '../core/types';

/** Fully-resolved options the dialog renders (labels/severity defaulted). */
export interface ActiveConfirmation {
  readonly id: number;
  readonly title: string;
  readonly message: string;
  readonly description?: string;
  readonly severity: 'warning' | 'danger' | 'info';
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly dismissible: boolean;
}

interface QueuedConfirmation extends ActiveConfirmation {
  readonly resolve: (result: ConfirmationResult) => void;
}

/**
 * Framework-agnostic queue of confirmation requests. One dialog shows at a
 * time; further requests wait so a critical prompt is never hidden behind
 * another layer. The React binding lives in confirm-root.tsx via
 * `useSyncExternalStore`.
 */
class ConfirmStore {
  private active: QueuedConfirmation | null = null;
  private readonly queue: QueuedConfirmation[] = [];
  private readonly listeners = new Set<() => void>();
  private counter = 0;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ActiveConfirmation | null => this.active;

  /** Server snapshot: no dialog exists during SSR. */
  getServerSnapshot = (): ActiveConfirmation | null => null;

  request(input: ResolvedConfirmInput): Promise<ConfirmationResult> {
    return new Promise((resolve) => {
      const item: QueuedConfirmation = { id: ++this.counter, resolve, ...input };
      if (this.active) {
        this.queue.push(item);
      } else {
        this.active = item;
        this.emit();
      }
    });
  }

  /** Called by the dialog when the user picks an outcome. */
  resolveActive(action: ConfirmationResult['action']): void {
    const current = this.active;
    if (!current) return;
    current.resolve({ confirmed: action === 'confirm', action });
    this.active = this.queue.shift() ?? null;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

interface ResolvedConfirmInput {
  title: string;
  message: string;
  description?: string;
  severity: ActiveConfirmation['severity'];
  confirmLabel: string;
  cancelLabel: string;
  dismissible: boolean;
}

export const confirmStore = new ConfirmStore();

/** Generic confirmation. Resolves with an explicit confirm/cancel/dismiss. */
export function confirm(request: ConfirmationRequest): Promise<ConfirmationResult> {
  return confirmStore.request({
    title: request.title,
    message: request.message,
    description: request.description,
    severity: request.severity ?? 'warning',
    confirmLabel: request.confirmLabel ?? 'Confirmar',
    cancelLabel: request.cancelLabel ?? 'Cancelar',
    dismissible: request.dismissible ?? true,
  });
}

/**
 * Destructive confirmation preset: danger styling, "Eliminar" as the verb, and
 * the "no se puede deshacer" consequence line. Cancel receives initial focus.
 */
export function confirmDelete(request: ConfirmDeleteRequest): Promise<ConfirmationResult> {
  const named = request.name ? ` «${request.name}»` : '';
  const base = `Se eliminará ${request.entity}${named}. Esta acción no se puede deshacer.`;
  return confirmStore.request({
    title: `Eliminar ${request.entity}`,
    message: request.message ? `${base} ${request.message}` : base,
    severity: 'danger',
    confirmLabel: request.confirmLabel ?? 'Eliminar',
    cancelLabel: 'Cancelar',
    dismissible: true,
  });
}
