'use client';

import { roleLabel } from '@/shared/lib/roles';
import {
  CircleUserRound,
  IdCard,
  KeyRound,
  Mail,
  MonitorSmartphone,
  Moon,
  Palette,
  PersonStanding,
  ShieldCheck,
  Sun,
  Tag,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { AnatomyCredit } from '@/features/anatomy/components/anatomy-credit';
import { LogoutButton } from '@/shared/components/layout/logout-button';
import { PageHeader } from '@/shared/components/layout/page-header';
import { ListCard } from '@/shared/components/mobile/nav-row';
import { Section } from '@/shared/components/mobile/section';
import { Segmented } from '@/shared/components/ui/segmented';
import { useTheme } from '@/shared/theme/theme-provider';

const THEME_OPTIONS = [
  { value: 'dark', label: 'Oscuro' },
  { value: 'light', label: 'Claro' },
] as const;

/** `Section` + `Card list` del móvil: título 17/600 con glifo y filas separadas por divisor. */
function Group({ icon: Icon, title, children }: Readonly<{ icon: LucideIcon; title: string; children: ReactNode }>) {
  return (
    <Section icon={Icon} title={title}>
      <ListCard className="divide-y divide-[var(--border)]">{children}</ListCard>
    </Section>
  );
}

/** `Row` del móvil: glifo + etiqueta 15 apagada a la izquierda, valor 15 a la derecha. */
function Row({ icon: Icon, label, children }: Readonly<{ icon: LucideIcon; label: string; children: ReactNode }>) {
  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3">
      <span className="t-subhead inline-flex items-center gap-2 text-[var(--text-muted)]">
        <Icon aria-hidden className="size-4" />
        {label}
      </span>
      <span className="t-subhead min-w-0 text-right font-medium">{children}</span>
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
    <div className="mx-auto grid w-full max-w-[560px] gap-8">
      <PageHeader title="Ajustes" />

      <Group icon={UserRound} title="Cuenta">
        {name ? (
          <Row icon={CircleUserRound} label="Nombre">
            {name}
          </Row>
        ) : null}
        <Row icon={Mail} label="Correo">
          <span className="break-all">{email}</span>
        </Row>
        <Row icon={IdCard} label="Tipo de cuenta">
          {roleLabel(role)}
        </Row>
        <Row icon={KeyRound} label="Sesión">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck aria-hidden className="size-4 text-[var(--success)]" />
            Protegida en una cookie segura
          </span>
        </Row>
      </Group>

      <Group icon={Palette} title="Apariencia">
        <Row icon={theme === 'light' ? Sun : Moon} label="Tema">
          <Segmented label="Tema" onChange={setTheme} options={THEME_OPTIONS} value={theme} />
        </Row>
      </Group>

      <Group icon={MonitorSmartphone} title="Aplicación">
        <Row icon={Tag} label="Versión">
          {version}
        </Row>
      </Group>

      <Section icon={PersonStanding} title="Créditos">
        <div className="panel p-5">
          <AnatomyCredit className="t-subhead" />
        </div>
      </Section>

      {/* Como en el móvil: cerrar sesión al final, a lo ancho y en rojo. */}
      <LogoutButton block withLabel />
    </div>
  );
}
