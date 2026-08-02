import { AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export function ErrorPanel({
  message,
  onRetry,
}: Readonly<{ message: string; onRetry?: () => void }>) {
  return (
    <div
      className="rounded-[8px] border border-[var(--danger-border)] bg-[var(--danger-surface)] p-5"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[var(--danger-text)]" />
        <div className="grid gap-3">
          <div>
            <p className="font-semibold text-[var(--danger-text)]">
              No se pudo cargar la información
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{message}</p>
          </div>
          {onRetry ? (
            <Button className="w-fit" onClick={onRetry} size="sm" variant="danger">
              Reintentar
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
