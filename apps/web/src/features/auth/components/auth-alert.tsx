import { AlertCircle } from 'lucide-react';

/**
 * El aviso de que el servidor ha rechazado el envío.
 *
 * Vive justo encima del botón y no al principio del formulario: quien pulsa
 * «Iniciar sesión» tiene la vista en el botón, y un mensaje en la cabecera —a
 * una pantalla de scroll en un teléfono— se pierde. `role="alert"` hace que se
 * anuncie en cuanto aparece, que es la otra mitad del problema: sin él, pulsar
 * el botón y que no ocurra nada es lo único que percibe quien no ve la
 * pantalla.
 *
 * Es un componente y no una `<p>` repetida en cada formulario porque la web y
 * el móvil tienen ahora el mismo contrato de error, y cambiarlo debe ser un
 * solo cambio por plataforma.
 */
export function AuthAlert({ message }: Readonly<{ message: string }>) {
  return (
    <p
      className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--danger-border)] bg-[var(--danger-surface)] p-3 text-sm leading-6 text-[var(--danger-text)]"
      role="alert"
    >
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}
