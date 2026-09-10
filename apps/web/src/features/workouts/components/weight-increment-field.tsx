'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '@/features/profile/services/profile-service';
import { cn } from '@/shared/lib/cn';
import { notify } from '@/shared/notifications';

const OPTIONS = [1.25, 2.5, 5] as const;

/**
 * Cuánto suma cada chip rápido al registrar una serie.
 *
 * Vive en `workouts` y no en `profile`: es una preferencia de cómo se usa el
 * registro de series, no un dato sobre la cuenta. Se guarda al tocar, como el
 * resto de preferencias de esta página.
 *
 * Mismo control y mismo texto que en la aplicación móvil.
 */
export function WeightIncrementField({ value }: Readonly<{ value: number | undefined }>) {
  const queryClient = useQueryClient();
  const current = value ?? 2.5;

  const save = useMutation({
    mutationFn: profileService.updateWeightIncrement,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      notify.success('Preferencia guardada.');
    },
    onError: (error: Error) => notify.error(error.message),
  });

  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium text-[var(--text)]">Chips de peso</p>
      <p className="text-xs text-[var(--text-muted)]">
        Cuánto suma cada chip («+{current.toLocaleString('es-ES')} kg») al registrar una serie.
      </p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => {
          const active = option === current;
          return (
            <button
              aria-pressed={active}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                active
                  ? 'border-[var(--volt)] bg-[color-mix(in_srgb,var(--volt)_14%,transparent)] text-[var(--text)]'
                  : 'border-[var(--border-subtle)] bg-[var(--surface-low)] text-[var(--text-muted)]',
              )}
              disabled={save.isPending}
              key={option}
              onClick={() => save.mutate(option)}
              type="button"
            >
              {option.toLocaleString('es-ES')} kg
            </button>
          );
        })}
      </div>
    </div>
  );
}
