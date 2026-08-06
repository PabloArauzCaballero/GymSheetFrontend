import type { Metadata, Viewport } from 'next';
import { Hanken_Grotesk } from 'next/font/google';
import type { ReactNode } from 'react';
import { serverEnv } from '@/shared/config/env';
import { themeInitScript } from '@/shared/theme/theme-script';
import { Providers } from './providers';
import './globals.css';

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-hanken',
});

export const metadata: Metadata = {
  metadataBase: new URL(serverEnv.APP_URL),
  title: {
    default: 'GymSheet',
    template: '%s · GymSheet',
  },
  description: 'Registro técnico de entrenamiento y operaciones de gimnasio.',
};

/**
 * `viewportFit: 'cover'` habilita `env(safe-area-inset-*)` para respetar el
 * notch / barras del sistema en móviles. `maximumScale`/`userScalable` se dejan
 * en sus valores por defecto (zoom permitido) para no romper accesibilidad.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
    { media: '(prefers-color-scheme: light)', color: '#f3f4f0' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      className={hankenGrotesk.variable}
      data-scroll-behavior="smooth"
      lang="es-BO"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
