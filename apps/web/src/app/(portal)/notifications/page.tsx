import type { Metadata } from 'next';
import { NotificationsPageClient } from '@/features/notifications/components/notifications-page-client';
export const metadata: Metadata = { title: 'Notificaciones' };
export default function NotificationsPage() {
  return <NotificationsPageClient />;
}
