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
        {/* `min-w-0` + `break-words`: `message` viene del servidor y a veces trae
            una URL o un identificador sin espacios. Un hijo de flex no se encoge
            por debajo de su contenido mínimo, así que esa palabra estiraba el
            panel, y con él la página entera — 107 px de scroll horizontal a
            412 px en `/admin/facilities` (M-12). El defecto salió a la luz al
            arreglar A-3: cuanto mejor se ven los errores, más se nota esto. */}
        <div className="grid min-w-0 gap-3">
          <div>
            <p className="font-semibold text-[var(--danger-text)]">
              No se pudo cargar la información
            </p>
            <p className="mt-1 break-words text-sm leading-6 text-[var(--text-muted)]">{message}</p>
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
