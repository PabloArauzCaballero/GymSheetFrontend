import type { Metadata } from 'next';
import { AdminOverview } from '@/features/admin/components/admin-overview';
import { ButtonLink } from '@/shared/components/ui/button';
import { impersonatedGym } from '@/shared/server/impersonation';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Administración' };

export default async function AdminPage() {
  const [session, gym] = await Promise.all([requireRole(['SYSTEM_ADMIN']), impersonatedGym()]);
  return (
    <div className="grid gap-8">
      {gym ? null : (
        <aside className="panel mx-auto flex w-full max-w-[560px] flex-col gap-4 p-5 sm:flex-row sm:items-center lg:max-w-[1040px]">
          <p className="min-w-0 flex-1 text-[15px] leading-6 text-[var(--text-muted)]">
            Estos módulos actúan sobre un gimnasio. Elige cuál vas a operar.
          </p>
          <ButtonLink href="/sistema" size="sm" variant="primary">
            Elegir gimnasio
          </ButtonLink>
        </aside>
      )}
      <AdminOverview permissions={session.permissions} role={session.role} />
    </div>
  );
}
