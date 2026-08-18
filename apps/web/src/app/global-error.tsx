'use client';

import { Button } from '@/shared/components/ui/button';
import { buildThemeCss } from '@/shared/theme/build-theme-css';
import { defaultTheme } from '@/shared/theme/default-palette';

/**
 * Pantalla de último recurso: sustituye al documento entero cuando falla el
 * layout raíz, de modo que no recibe el bloque de tema del inquilino. Lleva por
 * eso su propia copia de las variables.
 *
 * Usa deliberadamente la paleta de referencia y no la del inquilino: si algo se
 * rompió tan arriba, la resolución de identidad es sospechosa, y mostrar el
 * error con colores conocidos es más fiable que arriesgar una segunda caída.
 */
const fallbackTheme = buildThemeCss(defaultTheme);

export default function GlobalError({
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <html lang="es-BO">
      <body className="grid min-h-dvh place-items-center bg-[var(--background)] px-5 text-[var(--text)]">
        <style dangerouslySetInnerHTML={{ __html: fallbackTheme }} />
        <main className="max-w-lg text-center">
          <p className="data-label text-[var(--danger-text)]">Error inesperado</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.02em]">
            La interfaz no pudo continuar.
          </h1>
          <p className="mt-5 leading-7 text-[var(--text-muted)]">
            Reintenta la operación. Si el problema persiste, conserva el identificador de la
            solicitud mostrado por la API.
          </p>
          <Button className="mt-8" onClick={reset} variant="primary">
            Reintentar
          </Button>
        </main>
      </body>
    </html>
  );
}
