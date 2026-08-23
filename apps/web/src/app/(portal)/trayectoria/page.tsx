import type { Metadata } from 'next';
import { ProgressionClient } from '@/features/progression/components/progression-client';

export const metadata: Metadata = { title: 'Tu senda' };

export default function TrayectoriaPage() {
  return <ProgressionClient />;
}
