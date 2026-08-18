import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { serverEnv } from '@/shared/config/env';
import { fontClassNames } from '@/shared/theme/brand-fonts';
import { currentBrand, currentTheme, currentThemeStyle } from '@/shared/theme/tenant-theme.server';
import { themeInitScript } from '@/shared/theme/theme-script';
import { Providers } from './providers';
import './globals.css';

/**
 * Título y descripción salen de la marca del inquilino: en un despliegue
 * compartido, la pestaña del navegador no puede anunciar siempre el mismo
 * gimnasio.
 */
export async function generateMetadata(): Promise<Metadata> {
  const brand = await currentBrand();
  return {
    metadataBase: new URL(serverEnv.APP_URL),
    title: { default: brand.name, template: `%s · ${brand.name}` },
    description: 'Registro técnico de entrenamiento y operaciones de gimnasio.',
  };
}

/**
 * `viewportFit: 'cover'` habilita `env(safe-area-inset-*)` para respetar el
 * notch / barras del sistema en móviles. `maximumScale`/`userScalable` se dejan
 * en sus valores por defecto (zoom permitido) para no romper accesibilidad. El
 * color de la barra del sistema sale de la paleta, para que el cromo del
 * navegador acompañe a la marca.
 */
export async function generateViewport(): Promise<Viewport> {
  const theme = await currentTheme();
  return {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: [
      { media: '(prefers-color-scheme: dark)', color: theme.dark.background },
      { media: '(prefers-color-scheme: light)', color: theme.light.background },
    ],
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { theme, css } = await currentThemeStyle();
  return (
    <html
      className={fontClassNames}
      data-scroll-behavior="smooth"
      data-tenant={theme.id}
      lang="es-BO"
      suppressHydrationWarning
    >
      <head>
        {/* Las variables de identidad viajan con el documento: al llegar antes
            del primer pintado no existe un instante con la marca equivocada.
            El contenido lo compone `buildThemeCss`, que rechaza cualquier valor
            con caracteres capaces de cerrar el bloque o abrir marcado; no hay
            entrada de usuario en este camino, sólo configuración validada. */}
        <style dangerouslySetInnerHTML={{ __html: css }} id="tenant-theme" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers brand={theme.brand}>{children}</Providers>
      </body>
    </html>
  );
}
