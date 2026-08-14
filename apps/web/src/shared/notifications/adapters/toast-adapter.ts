import { toast } from 'sonner';
import type { NotificationRequest, NotificationSeverity } from '../core/types';

/**
 * Boundary between the engine and the visual toast provider. Swapping libraries
 * (sonner → notistack, react-hot-toast, …) means reimplementing only this file;
 * no feature code imports the provider directly.
 */
export interface ToastAdapter {
  show(request: NotificationRequest): string | number;
  dismiss(id?: string | number): void;
}

const SONNER_METHOD: Record<NotificationSeverity, 'success' | 'info' | 'warning' | 'error'> = {
  success: 'success',
  info: 'info',
  warning: 'warning',
  error: 'error',
  // `danger` is a modal concept; as a toast it renders like an error.
  danger: 'error',
};

function durationToSonner(duration: NotificationRequest['duration']): number | undefined {
  if (duration === 'persistent') return Infinity;
  return duration;
}

export const sonnerAdapter: ToastAdapter = {
  show(request) {
    const method = SONNER_METHOD[request.severity];
    // Sonner escapes string content as text — no untrusted HTML is rendered.
    const body = request.title ?? request.message;
    return toast[method](body, {
      id: request.id,
      description: request.title ? request.message : request.description,
      duration: durationToSonner(request.duration),
      dismissible: request.dismissible ?? true,
      action: request.action
        ? { label: request.action.label, onClick: request.action.onClick }
        : undefined,
    });
  },
  dismiss(id) {
    toast.dismiss(id);
  },
};
