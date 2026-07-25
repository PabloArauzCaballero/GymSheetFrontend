import type { Metadata } from 'next';
import { AccessPageClient } from '@/features/access/components/access-page-client';
export const metadata: Metadata = { title: 'Acceso' };
export default function AccessPage() {
  return <AccessPageClient />;
}
