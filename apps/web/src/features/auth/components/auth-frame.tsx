'use client';

import type { ReactNode } from 'react';
import { Activity, BarChart3, ShieldCheck } from 'lucide-react';
import { useBrand } from '@/shared/theme/brand-provider';
import { AmbientBackground } from '@/shared/components/background/ambient-background';
import { BrandLockup, BrandMark } from '@/shared/components/brand/brand-mark';

const PILLARS = [
  { icon: Activity, label: 'Entrenamiento', detail: 'Registro en vivo' },
  { icon: BarChart3, label: 'Progreso', detail: 'Historial verificable' },
  { icon: ShieldCheck, label: 'Seguridad', detail: 'Sesión protegida' },
] as const;

/**
 * El marco de las pantallas de sesión.
 *
 * Dos columnas en pantalla ancha: a la izquierda la promesa del producto, a la
 * derecha el trabajo. La izquierda desaparece por debajo de `lg` en lugar de
 * encogerse — un manifiesto a media columna no convence a nadie y le roba
 * altura al formulario, que es lo único que hace falta en un teléfono.
 *
 * El formulario vive dentro de una tarjeta translúcida y no suelto sobre el
 * fondo. El fondo ambiental se mueve, y un campo de texto flotando sobre orbes
 * a la deriva no se lee como una superficie donde escribir; la tarjeta le da un
 * plano propio y separa por luminancia, no por sombra.
 *
 * **El ritmo vertical se lleva con `gap`, nunca con `mt-*` sobre títulos ni
 * párrafos.** `globals.css` declara `h1, h2, h3, p { margin-block: 0 }` fuera de
 * toda `@layer`, y el CSS sin capa gana a las utilidades de Tailwind, que sí
 * viven en una: cualquier `mt-6` sobre un `<h1>` de esta aplicación se calcula
 * como cero. Lo que se veía aquí antes era el interlineado, no el espaciado
 * elegido. `gap` lo fija el contenedor y no lo toca ese reinicio.
 */
export function AuthFrame({
  eyebrow,
  title,
  description,
  children,
  footer,
}: Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  /** Enlaces bajo la tarjeta: cambiar de pantalla, recuperar la contraseña. */
  footer?: ReactNode;
}>) {
  const brand = useBrand();

  return (
    <main className="relative isolate grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(460px,0.95fr)]">
      <AmbientBackground variant="auth" reactive fixed />

      <section className="relative hidden border-r border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-sidebar)_72%,transparent)] p-12 backdrop-blur-sm lg:flex lg:flex-col lg:justify-between xl:p-16">
        <BrandLockup size={40} />

        <div className="flex max-w-2xl flex-col gap-7">
          <p className="data-label text-[var(--accent-ink)]">Tu entrenamiento, por fin conectado</p>
          {/* El peso baja según sube el tamaño: a 7xl un 700 se lee como
              volumen y no como letra. La jerarquía la hace el cuerpo. */}
          <h2 className="text-5xl font-semibold leading-[1.05] tracking-[-0.026em] xl:text-7xl">
            Entrena con precisión.
            <br />
            Progresa con propósito.
            <br />
            <span className="text-gradient-volt">Sin fricción.</span>
          </h2>
          <p className="max-w-xl text-lg leading-8 text-[var(--text-muted)]">
            Registra cada serie, entiende tu evolución y mantén tu gimnasio contigo en una
            experiencia profesional.
          </p>
        </div>

        <div className="stagger grid grid-cols-3 gap-4">
          {PILLARS.map(({ icon: Icon, label, detail }) => (
            <div
              className="hover-lift group flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-lowest)] p-5"
              key={label}
            >
              <span className="grid size-9 place-items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-low)] text-[var(--text-muted)] transition-colors duration-[var(--dur-2)] group-hover:border-[var(--volt)] group-hover:text-[var(--accent-ink)]">
                <Icon className="size-5" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-xs text-[var(--text-muted)]">{detail}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="relative flex items-center justify-center px-5 py-12 sm:px-8 lg:px-12">
        <div className="reveal flex w-full max-w-[26rem] flex-col gap-8">
          {/* El emblema encabeza la columna en TODOS los tamaños, no sólo en
              móvil. En ancho, la marca vivía únicamente en la columna de la
              izquierda, así que el formulario —lo que de verdad se mira— no
              tenía encima nada que dijera de quién es la cuenta que se está
              creando. */}
          <div className="flex flex-col items-center gap-5 text-center">
            <BrandMark size={56} />
            <div className="flex flex-col items-center gap-3">
              <p className="data-label inline-flex items-center gap-2 text-[var(--text-muted)]">
                <span aria-hidden className="h-3 w-[3px] rounded-full bg-[var(--volt)]" />
                {eyebrow}
              </p>
              <h1 className="text-[2.125rem] font-semibold leading-[1.1] tracking-[-0.026em]">
                {title}
              </h1>
              <p className="text-sm leading-6 text-[var(--text-muted)]">{description}</p>
            </div>
          </div>

          <div className="glass rounded-[var(--radius-xl)] border border-[var(--border-subtle)] p-6 shadow-[var(--shadow-lg)] sm:p-7">
            {children}
          </div>

          {footer ? <div className="flex flex-col gap-3 text-center text-sm">{footer}</div> : null}

          <p className="text-center text-xs text-[var(--text-disabled)]">
            {brand.name} · Sesión protegida
          </p>
        </div>
      </section>
    </main>
  );
}
