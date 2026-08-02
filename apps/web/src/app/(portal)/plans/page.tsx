import type { Metadata } from 'next';
import { MyPlansClient } from '@/features/training/components/my-plans-client';

export const metadata: Metadata = { title: 'Mis planes' };

export default function PlansPage() {
  return <MyPlansClient />;
}
