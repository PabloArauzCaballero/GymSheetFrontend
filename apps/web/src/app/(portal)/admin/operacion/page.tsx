import type { Metadata } from 'next';
import { OperationsDashboard } from '@/features/admin/components/operations-dashboard';

export const metadata: Metadata = { title: 'Operación' };

export default function OperacionPage() {
  return <OperationsDashboard />;
}
