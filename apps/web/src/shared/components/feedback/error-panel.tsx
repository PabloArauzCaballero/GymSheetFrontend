import { CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export function ErrorPanel({
  message,
  onRetry,
}: Readonly<{ message: string; onRetry?: () => void }>) {
  return (
    // `ErrorState` del móvil: la misma tarjeta centrada que el vacío, con la
    // nube desconectada, y «Reintentar» en secundario —reintentar no es la
    // acción principal de la pantalla—. `min-w-0` + `break-words`: el mensaje
    // viene del servidor y a veces trae una URL sin espacios (M-12).
    <div className="panel grid min-w-0 justify-items-center gap-2 px-6 py-8 text-center" role="alert">
      <CloudOff aria-hidden className="size-8 text-[var(--text-muted)]" />
      <p className="t-headline">No se pudo cargar la información</p>
      <p className="t-subhead max-w-md break-words text-[var(--text-muted)]">{message}</p>
      {onRetry ? (
        <Button className="mt-1" onClick={onRetry} size="sm" variant="secondary">
          <RefreshCw aria-hidden className="size-4" />
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
