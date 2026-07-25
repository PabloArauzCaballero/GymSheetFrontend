import type { ReactNode } from 'react';
import { requireRole } from '@/shared/server/session';

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireRole(['ADMIN', 'FRONT_DESK']);
  return children;
}
