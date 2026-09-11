import type { Metadata } from 'next';
import { InteractionsClient } from '@/features/interactions/components/interactions-client';

export const metadata: Metadata = { title: 'Interacciones' };

export default function InteractionsPage() {
  return <InteractionsClient />;
}
