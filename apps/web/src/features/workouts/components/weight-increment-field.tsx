'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '@/features/profile/services/profile-service';
import { Check } from 'lucide-react';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { notify } from '@/shared/notifications';

const OPTIONS = [1.25, 2.5, 5] as const;

/**
 * Cuánto suma cada chip rápido al registrar una serie.
 *
 * Vive en `workouts` y no en `profile`: es una preferencia de cómo se usa el
 * registro de series, no un dato sobre la cuenta. Se guarda al tocar, como el
 * resto de preferencias de esta página.
 *
 * Mismo control y mismo texto que en la aplicación móvil: el título
 * («Incremento de peso») lo pone la sección que lo monta, y el chip elegido va
 * en blanco con su marca, como `FilterChip`, nunca en acento.
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
    <div className="grid gap-3">
      <p className="t-footnote text-pretty text-[var(--text-muted)]">
        Cuánto suma cada chip («+{current.toLocaleString('es-ES')} kg») al registrar una serie.
      </p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => {
          const active = option === current;
          return (
            <ChoiceChip className="gap-1.5" disabled={save.isPending} key={option} onClick={() => save.mutate(option)} selected={active}>
              {active ? <Check aria-hidden className="size-4" /> : null}
              {option.toLocaleString('es-ES')} kg
            </ChoiceChip>
          );
        })}
      </div>
    </div>
  );
}
