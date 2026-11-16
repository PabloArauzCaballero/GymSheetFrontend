'use client';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { shouldRetryQuery, shouldToastQueryError } from '@/shared/api/query-error-policy';
import { leaveIfSuspended } from '@/shared/auth/suspension';
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
            // A suspension mid-session is not «sesión expirada»: leave and say why.
            if (leaveIfSuspended(error)) return;
            if (!shouldToastQueryError(error)) return;
            if (query.state.data !== undefined) {
              notify.error('No pudimos actualizar la información.');
              return;
            }
            notify.error(error instanceof Error ? error : 'No pudimos cargar la información.');
          },
        }),
        mutationCache: new MutationCache({ onError: (error) => void leaveIfSuspended(error) }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: shouldRetryQuery,
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
          // Por debajo de la cabecera fija: el aviso no tapa el nombre del usuario
          // ni el título de la página (en móvil la cabecera lleva además la
          // navegación compacta).
          offset={{ top: 'calc(4.5rem + env(safe-area-inset-top))', right: 16 }}
          mobileOffset={{ top: 'calc(7.5rem + env(safe-area-inset-top))', right: 16, left: 16 }}
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
