import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DashboardClient } from '@/features/dashboard/components/dashboard-client';
import { requireSession } from '@/shared/server/session';
import { staffHomeFor } from '@/shared/server/staff-home';

export const metadata: Metadata = { title: 'Inicio' };

export default async function DashboardPage() {
  const session = await requireSession();
  // El personal no entrena: su primera pantalla es su panel (ver `staffHomeFor`).
  const staffHome = staffHomeFor(session.role);
  if (staffHome) redirect(staffHome);
  const firstName = (session.nombreCompleto ?? '').trim().split(/\s+/u)[0] || undefined;
  return <DashboardClient firstName={firstName} />;
}
