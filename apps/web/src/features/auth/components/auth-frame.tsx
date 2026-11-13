'use client';

import type { ReactNode } from 'react';
import { registerBenefitLabels, valuePitch } from '@gymsheet/domain';
import { Dumbbell, Trophy, Users } from 'lucide-react';
import { IconBadge } from '@/shared/components/mobile/icon-badge';
import { useBrand } from '@/shared/theme/brand-provider';
import { AmbientBackground } from '@/shared/components/background/ambient-background';
import { BrandLockup } from '@/shared/components/brand/brand-mark';

/** Las ventajas del alta del móvil, con el color de su magnitud. */
const BENEFIT_ICONS = [
  { icon: Dumbbell, tone: 'weight' },
  { icon: Users, tone: 'reps' },
  { icon: Trophy, tone: 'record' },
] as const;

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
  wide = false,
}: Readonly<{
  /** Se acepta por compatibilidad; el móvil no lo muestra y la web tampoco. */
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
  /** Enlaces bajo la tarjeta: cambiar de pantalla, recuperar la contraseña. */
  footer?: ReactNode;
  /** Formulario largo (alta): tarjeta más ancha en escritorio para ir de dos en dos. */
  wide?: boolean;
}>) {
  const brand = useBrand();

  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center px-6 py-10 sm:px-8 lg:px-12">
      <AmbientBackground variant="auth" reactive fixed />

      {/* Teléfono: una columna, como `AuthShell` del móvil. Escritorio: el
          mensaje de la app a la izquierda —titular, ventajas del alta y la
          pantalla de Inicio de ejemplo— y el formulario a la derecha, para no
          dejar dos tercios de la pantalla vacíos alrededor de una columna. */}
      <div
        className={`reveal grid w-full max-w-[26rem] gap-6 lg:max-w-5xl lg:items-center lg:gap-12 xl:gap-20 ${wide ? 'lg:grid-cols-[minmax(0,1fr)_600px] xl:max-w-6xl' : 'lg:grid-cols-[minmax(0,1fr)_420px]'}`}
      >
        <div className="grid justify-items-center gap-2 text-center lg:justify-items-start lg:gap-6 lg:text-left">
          <div className="mb-1">
            <BrandLockup size={30} />
          </div>
          <div className="grid gap-2 lg:gap-3">
            <p className="display-title lg:text-[56px] lg:leading-[1.05]">{valuePitch.headline}</p>
            <p className="max-w-[340px] text-[15px] leading-5 text-[var(--text-muted)] lg:max-w-lg lg:text-[17px] lg:leading-7">
              {valuePitch.subline}
            </p>
          </div>
          <ul className="m-0 hidden list-none gap-3 p-0 lg:grid">
            {registerBenefitLabels.map((label, index) => (
              <li className="flex items-center gap-3" key={label}>
                <IconBadge icon={BENEFIT_ICONS[index]!.icon} tone={BENEFIT_ICONS[index]!.tone} />
                <span className="text-[17px]">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-6">
          <div className="flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-6 shadow-[var(--shadow-md)] lg:p-8">
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
      </div>
    </main>
  );
}
