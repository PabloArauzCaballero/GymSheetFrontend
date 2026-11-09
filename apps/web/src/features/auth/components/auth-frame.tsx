'use client';

import type { ReactNode } from 'react';
import { valuePitch } from '@gymsheet/domain';
import { useBrand } from '@/shared/theme/brand-provider';
import { AmbientBackground } from '@/shared/components/background/ambient-background';
import { BrandLockup } from '@/shared/components/brand/brand-mark';

/**
 * El marco de las pantallas de sesión: el mismo que `AuthShell` del móvil.
 *
 * Una sola columna centrada en todos los tamaños —logotipo, titular en la
 * display, subtítulo y la tarjeta del formulario— para que quien instala la
 * app y luego entra por el navegador vea la misma pantalla. El titular es el
 * de la ficha de la tienda (`valuePitch`, compartido en `@gymsheet/domain`);
 * el título del formulario va dentro de la tarjeta, como en el móvil.
 *
 * **El ritmo vertical se lleva con `gap`**, no con márgenes sobre títulos.
 */
export function AuthFrame({
  title,
  description,
  children,
  footer,
}: Readonly<{
  /** Se acepta por compatibilidad; el móvil no lo muestra y la web tampoco. */
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
  /** Enlaces bajo la tarjeta: cambiar de pantalla, recuperar la contraseña. */
  footer?: ReactNode;
}>) {
  const brand = useBrand();

  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center px-6 py-12 sm:px-8">
      <AmbientBackground variant="auth" reactive fixed />

      <div className="reveal flex w-full max-w-[26rem] flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="mb-1">
            <BrandLockup size={30} />
          </div>
          <p className="display-title">
            {valuePitch.headline}
          </p>
          <p className="max-w-[340px] text-[15px] leading-5 text-[var(--text-muted)]">
            {valuePitch.subline}
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-6 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-1">
            <h1 className="title-text">{title}</h1>
            <p className="text-[13px] leading-[18px] text-[var(--text-muted)]">{description}</p>
          </div>
          {children}
        </div>

        {footer ? (
          <div className="flex flex-col items-center gap-3 text-center text-[15px]">{footer}</div>
        ) : null}

        <p className="text-center text-xs text-[var(--text-muted)]">{brand.name} · Sesión protegida</p>
      </div>
    </main>
  );
}
