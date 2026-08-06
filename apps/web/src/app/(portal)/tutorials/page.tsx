import type { Metadata } from 'next';
import { TutorialCenter } from '@/features/tutorials';

export const metadata: Metadata = { title: 'Centro de ayuda' };

export default function TutorialsPage() {
  return <TutorialCenter />;
}
