import type { Metadata } from 'next';
import { Suspense } from 'react';
import { StartWorkoutForm } from '@/features/workouts/components/start-workout-form';
export const metadata: Metadata = { title: 'Nueva sesión' };
export default function NewWorkoutPage() {
  return (
    <Suspense
      fallback={<div className="h-96 animate-pulse rounded-[8px] bg-[var(--surface-low)]" />}
    >
      <StartWorkoutForm />
    </Suspense>
  );
}
