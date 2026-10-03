'use client';

import { Info, Moon, Palette, ShieldCheck, Sun, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { AnatomyCredit } from '@/features/anatomy/components/anatomy-credit';
import { LogoutButton } from '@/shared/components/layout/logout-button';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Segmented } from '@/shared/components/ui/segmented';
import { useTheme } from '@/shared/theme/theme-provider';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administración',
  CLIENTE: 'Socio',
  COACH: 'Entrenador',
  ENTRENADOR_EXTERNO: 'Entrenador externo',
  FRONT_DESK: 'Recepción',
  SYSTEM_ADMIN: 'Plataforma',
};

const THEME_OPTIONS = [
  { value: 'dark', label: 'Oscuro' },
  { value: 'light', label: 'Claro' },
] as const;

function Group({ icon, title, children }: Readonly<{ icon: ReactNode; title: string; children: ReactNode }>) {
  return (
    <section aria-label={title} className="grid content-start gap-3">
      <h2 className="data-label inline-flex items-center gap-2 text-[var(--text-muted)]">
        {icon}
        {title}
      </h2>
      <div className="panel divide-y divide-[var(--border-subtle)]">{children}</div>
    </section>
  );
}

function Row({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium">{children}</span>
    </div>
  );
}

/**
 * Ajustes de la cuenta: lo que en el móvil vive en su pantalla de Ajustes.
 * Cuenta, apariencia, la versión que corre y los créditos que la licencia de
 * las láminas anatómicas exige mostrar. Cerrar sesión va al final y aparte,
 * como acción destructiva que es.
 */
export function SettingsPage({
  email,
  role,
  name,
  version,
}: Readonly<{ email: string; role: string; name?: string; version: string }>) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid gap-8">
      <PageHeader description="Tu cuenta, la apariencia y la información de la aplicación." title="Ajustes" />
      <div className="grid gap-8 lg:grid-cols-2">
        <Group icon={<UserRound aria-hidden className="size-4" />} title="Cuenta">
          {name ? <Row label="Nombre">{name}</Row> : null}
          <Row label="Correo">
            <span className="break-all">{email}</span>
          </Row>
          <Row label="Tipo de cuenta">{ROLE_LABEL[role] ?? role}</Row>
          <Row label="Sesión">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck aria-hidden className="size-4 text-[var(--success)]" />
              Protegida en una cookie segura
            </span>
          </Row>
        </Group>

        <Group icon={<Palette aria-hidden className="size-4" />} title="Apariencia">
          <Row label="Tema">
            <span className="inline-flex items-center gap-3">
              {theme === 'light' ? (
                <Sun aria-hidden className="size-4 text-[var(--text-muted)]" />
              ) : (
                <Moon aria-hidden className="size-4 text-[var(--text-muted)]" />
              )}
              <Segmented label="Tema" onChange={setTheme} options={THEME_OPTIONS} value={theme} />
            </span>
          </Row>
        </Group>

        <Group icon={<Info aria-hidden className="size-4" />} title="Aplicación">
          <Row label="Versión">{version}</Row>
          <div className="grid gap-2 px-5 py-4">
            <span className="text-sm text-[var(--text-muted)]">Créditos</span>
            <AnatomyCredit className="text-sm" />
          </div>
        </Group>

        <section aria-label="Sesión" className="grid content-start gap-3">
          <h2 className="data-label text-[var(--text-muted)]">Sesión</h2>
          <div className="panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <p className="text-sm text-[var(--text-muted)]">Sal de tu cuenta en este navegador.</p>
            <LogoutButton withLabel />
          </div>
        </section>
      </div>
    </div>
  );
}
