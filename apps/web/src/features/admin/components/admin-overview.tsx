import type { UserRole } from '@/shared/api/contracts';
import { PageHeader } from '@/shared/components/layout/page-header';
import { adminNavigation, canSee } from '@/shared/components/layout/nav-config';
import { Divider, ListCard, NavRow } from '@/shared/components/mobile/nav-row';
import { Section } from '@/shared/components/mobile/section';

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

  // Agrupadas como los ajustes del móvil: filas que navegan dentro de una
  // tarjeta por grupo, glifo callado, título 17/600 y su descripción.
  const groups = MODULE_GROUPS.map((group) => ({
    ...group,
    items: visibleModules.filter((module) => group.hrefs.includes(module.href)),
  }));
  const grouped = new Set(MODULE_GROUPS.flatMap((group) => group.hrefs));
  const rest = visibleModules.filter((module) => !grouped.has(module.href));
  if (rest.length) groups.push({ title: 'Más', hrefs: [], items: rest });

  return (
    <div className="mx-auto grid w-full max-w-[560px] gap-8 lg:max-w-[1040px]">
      <PageHeader
        description="Lo que tu cuenta puede ver y hacer en el gimnasio."
        title="Administración"
        tutorialId="page:admin"
      />
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        {groups
          .filter((group) => group.items.length > 0)
          .map((group) => (
            <Section key={group.title} title={group.title}>
              <ListCard>
                {group.items.map((module, index) => {
                  const Icon = module.icon;
                  return (
                    <div key={module.href}>
                      {index > 0 ? <Divider /> : null}
                      <NavRow
                        href={module.href}
                        leading={<Icon aria-hidden className="size-5 shrink-0 text-[var(--text-muted)]" />}
                        subtitle={module.description}
                        title={module.label}
                      />
                    </div>
                  );
                })}
              </ListCard>
            </Section>
          ))}
      </div>
    </div>
  );
}

/** Grupos de módulos: el día a día de recepción primero, la configuración después. */
const MODULE_GROUPS: { title: string; hrefs: string[] }[] = [
  {
    title: 'Día a día',
    hrefs: ['/admin/operacion', '/admin/usuarios', '/admin/membership', '/admin/people', '/admin/access'],
  },
  { title: 'Gimnasio', hrefs: ['/admin/equipment', '/admin/facilities', '/admin/exercises'] },
  { title: 'Seguridad y control', hrefs: ['/admin/moderacion', '/admin/permissions', '/admin/auditoria'] },
];
