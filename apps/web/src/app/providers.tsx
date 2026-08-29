'use client';

import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/api-error';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { ConfirmRoot, notify } from '@/shared/notifications';
import type { TenantBrand } from '@/shared/theme/brand-contract';
import { BrandProvider } from '@/shared/theme/brand-provider';
import { ThemeProvider } from '@/shared/theme/theme-provider';

export function Providers({
  brand,
  children,
}: Readonly<{ brand: TenantBrand; children: ReactNode }>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        /*
         * Red global de errores de lectura.
         *
         * Veinte componentes ramifican `cargando ? … : datos.length === 0 ? vacío : filas`
         * sin rama de error, así que una consulta caída se pintaba como «no hay nada»:
         * el diálogo de añadir ejercicio decía «No hay ejercicios que coincidan» en
         * mitad del entrenamiento. Sin aviso global el fallo era completamente
         * silencioso —ni toast, ni banner, sólo un 404 en la consola— y el usuario
         * concluía que sus datos no existían.
         *
         * Esto no sustituye a una rama de error por pantalla; garantiza que ningún
         * fallo de carga pase desapercibido mientras se añaden. Sólo se avisa cuando
         * ya hay datos en pantalla o se agotaron los reintentos, para no gritar por
         * un fallo transitorio que el retry va a resolver solo.
         * Ver A-3 en hive/reports/qa-frontend.md.
         */
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (error instanceof ApiError && error.kind === 'unauthorized') return;
            if (query.state.data !== undefined) {
              notify.error(new Error('No pudimos actualizar la información.'));
              return;
            }
            notify.error(error instanceof Error ? error : new Error('No pudimos cargar la información.'));
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              if (
                error instanceof ApiError &&
                ['unauthorized', 'forbidden', 'not-found', 'validation'].includes(error.kind)
              )
                return false;
              return failureCount < 2;
            },
          },
          mutations: { retry: false },
        },
      }),
  );

  return (
    <ThemeProvider>
      <BrandProvider brand={brand}>
        <QueryClientProvider client={queryClient}>
        {children}
        <ConfirmRoot />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--surface-low)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            },
          }}
        />
        </QueryClientProvider>
      </BrandProvider>
    </ThemeProvider>
  );
}
