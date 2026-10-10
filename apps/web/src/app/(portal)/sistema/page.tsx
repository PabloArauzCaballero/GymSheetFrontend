import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/shared/components/layout/page-header';
import { canSee, systemNavigation } from '@/shared/components/layout/nav-config';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Sistema' };

/**
 * Portada de la consola de plataforma.
 *
 * Lista lo que ya existe y nombra lo que no, en vez de pintar tarjetas que no
 * llevan a ninguna parte: la consola se entrega por fases y una portada que
 * promete monitoreo, archivos y analítica antes de tenerlos convierte cada
 * visita en un clic fallido.
 */
export default async function SistemaPage() {
  const session = await requireRole(['SYSTEM_ADMIN']);
  const modules = systemNavigation.filter(
    (module) => module.description && canSee(module, session.role, session.permissions),
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        description="Operación por encima de los gimnasios: actividad administrativa de toda la plataforma."
        eyebrow="Plataforma"
        title="Sistema"
      />

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              className="panel group min-h-52 p-6 transition-colors hover:border-[var(--volt)] hover:bg-[var(--surface-low)]"
              href={module.href}
              key={module.href}
            >
              <Icon className="size-7 text-[var(--text-muted)]" />
              <h2 className="mt-10 text-2xl font-semibold tracking-[-0.02em]">{module.label}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                {module.description}
              </p>
              <p className="data-label mt-6 text-[var(--text-muted)] group-hover:text-[var(--text)]">
                Abrir módulo →
              </p>
            </Link>
          );
        })}
      </section>

      <section className="panel p-6">
        <h2 className="text-lg font-semibold tracking-[-0.02em]">En construcción</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
          Archivos, moderación, soporte corporativo, monitoreo del sistema y analítica de producto
          llegan en las fases siguientes del plan. Todavía no existen, así que no aparecen como
          enlaces.
        </p>
      </section>
    </div>
  );
}
