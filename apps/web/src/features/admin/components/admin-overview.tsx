import Link from 'next/link';
import type { UserRole } from '@/shared/api/contracts';
import { PageHeader } from '@/shared/components/layout/page-header';
import { adminNavigation, canSee } from '@/shared/components/layout/nav-config';

/**
 * Los módulos de administración a los que llega esta cuenta.
 *
 * La rejilla se deriva de `adminNavigation` en vez de mantener su propia lista:
 * eran dos inventarios de lo mismo y ya habían divergido —usuarios, panel del
 * gimnasio y registrar persona estaban en la navegación lateral y no aquí, así
 * que quien entraba por esta página no sabía que existían—. Entra lo que tenga
 * `description`, que es lo único que una tarjeta necesita y una entrada de menú
 * no.
 */
export function AdminOverview({
  role,
  permissions,
}: Readonly<{ role: UserRole; permissions?: readonly string[] }>) {
  const visibleModules = adminNavigation.filter(
    (module) => module.description && canSee(module, role, permissions),
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        description="Superficie operativa limitada por roles del backend. FRONT_DESK puede consultar y ejecutar solo las operaciones autorizadas."
        eyebrow="Operaciones"
        title="Administración"
        tutorialId="page:admin"
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
    </div>
  );
}
