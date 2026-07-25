import type { Metadata } from 'next';
import { Hanken_Grotesk } from 'next/font/google';
import type { ReactNode } from 'react';
import { serverEnv } from '@/shared/config/env';
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

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      className={hankenGrotesk.variable}
      data-scroll-behavior="smooth"
      lang="es-BO"
      suppressHydrationWarning
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
