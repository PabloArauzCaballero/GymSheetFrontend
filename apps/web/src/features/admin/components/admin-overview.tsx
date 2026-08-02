import { Activity, Building2, Dumbbell, KeyRound, Users } from 'lucide-react';
import Link from 'next/link';
import type { UserRole } from '@/shared/api/contracts';
import { PageHeader } from '@/shared/components/layout/page-header';

const modules = [
  {
    href: '/admin/equipment',
    title: 'Equipamiento',
    description: 'Inventario visible y operaciones autorizadas por rol.',
    icon: Dumbbell,
    roles: ['ADMIN', 'FRONT_DESK'],
  },
  {
    href: '/admin/exercises',
    title: 'Catálogo global',
    description: 'Ejercicios globales e importación controlada de dataset.',
    icon: Activity,
    roles: ['ADMIN'],
  },
  {
    href: '/admin/facilities',
    title: 'Instalaciones',
    description: 'Sedes, salas, puntos de acceso y mantenimiento.',
    icon: Building2,
    roles: ['ADMIN', 'FRONT_DESK'],
  },
  {
    href: '/admin/membership',
    title: 'Membresías',
    description: 'Planes, clientes, vigencias y personal.',
    icon: Users,
    roles: ['ADMIN', 'FRONT_DESK'],
  },
  {
    href: '/admin/access',
    title: 'Control de acceso',
    description: 'Dispositivos, decisiones y credenciales.',
    icon: KeyRound,
    roles: ['ADMIN', 'FRONT_DESK'],
  },
] as const;

export function AdminOverview({ role }: Readonly<{ role: UserRole }>) {
  const visibleModules = modules.filter((module) => new Set<UserRole>(module.roles).has(role));
  return (
    <div className="grid gap-8">
      <PageHeader
        description="Superficie operativa limitada por roles del backend. FRONT_DESK puede consultar y ejecutar solo las operaciones autorizadas."
        eyebrow="Operaciones"
        title="Administración"
      />
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {visibleModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              className="panel group min-h-52 p-6 transition-colors hover:border-[var(--volt)] hover:bg-[var(--surface-low)]"
              href={module.href}
              key={module.href}
            >
              <Icon className="size-7 text-[var(--accent-ink)]" />
              <h2 className="mt-10 text-2xl font-bold tracking-[-0.03em]">{module.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                {module.description}
              </p>
              <p className="data-label mt-6 group-hover:text-[var(--accent-ink)]">Abrir módulo →</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
