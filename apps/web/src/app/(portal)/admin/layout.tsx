import type { ReactNode } from 'react';
import { requireRole } from '@/shared/server/session';

/**
 * Gym administration is operated by REPP since franja 7a: only `SYSTEM_ADMIN`,
 * impersonating the gym when a page acts on one. Any other role is sent back
 * to its portal; the backend answers 403 to it on every `admin/*` route anyway.
 */
export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireRole(['SYSTEM_ADMIN']);
  return children;
}
