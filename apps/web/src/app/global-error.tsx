'use client';

import { Button } from '@/shared/components/ui/button';

export default function GlobalError({
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <html lang="es-BO">
      <body className="grid min-h-dvh place-items-center bg-black px-5 text-white">
        <main className="max-w-lg text-center">
          <p className="data-label text-[#ffb4ab]">Error inesperado</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.04em]">
            La interfaz no pudo continuar.
          </h1>
          <p className="mt-5 leading-7 text-[#8c8c8c]">
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
