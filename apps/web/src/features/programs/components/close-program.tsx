'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { CloseAction, Program } from '@gymsheet/types';
import { Button } from '@/shared/components/ui/button';
import { notify } from '@/shared/notifications';
import { programKeys, routineV2Keys } from '@/features/routines-v2/keys';
import { programService } from '@/features/routines-v2/services';

const OPTIONS: Array<{ accion: CloseAction; title: string; text: string; primary?: boolean }> = [
  { accion: 'REPEAT', title: 'Repetir con las cargas nuevas', text: 'Empieza otro programa igual, partiendo de las cargas que ya alcanzaste.', primary: true },
  { accion: 'CHOOSE_OTHER', title: 'Elegir otra rutina', text: 'Cierra este y te llevamos al catálogo.' },
  { accion: 'STOP', title: 'Apagar', text: 'Sin programa de pesas por ahora. Tu cardio, si lo tienes, sigue.' },
];

/** Cierre del programa (RF-19, D6): nada se repite solo; se pregunta qué sigue. */
export function CloseProgram({ program }: Readonly<{ program: Program }>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const close = useMutation({
    mutationFn: (accion: CloseAction) => programService.close(program.id, accion),
    onSuccess: async (result, accion) => {
      await queryClient.invalidateQueries({ queryKey: programKeys.all });
      await queryClient.invalidateQueries({ queryKey: routineV2Keys.all });
      if (accion === 'REPEAT') {
        notify.success('Programa repetido con las cargas nuevas.');
        router.push(result.siguiente ? `/programs/${result.siguiente.id}` : '/routines');
      } else if (accion === 'CHOOSE_OTHER') {
        router.push('/routines?tab=publicas');
      } else {
        notify.success('Programa apagado.');
        router.push('/routines');
      }
    },
    onError: (error: Error) => notify.error(error),
  });
  return (
    <section aria-labelledby="close-title" className="panel grid gap-5 border-[var(--volt)] p-6" data-testid="close-program">
      <div className="grid gap-1">
        <h2 className="text-xl font-semibold tracking-[-0.02em]" id="close-title">
          Terminaste «{program.rutinaNombre ?? 'tu programa'}». ¿Qué sigue?
        </h2>
        <p className="text-sm text-[var(--text-muted)]">Tus puntos y tus marcas se conservan elijas lo que elijas.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {OPTIONS.map((option) => (
          <div className="grid content-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-low)] p-4" key={option.accion}>
            <div className="grid gap-1">
              <p className="font-semibold">{option.title}</p>
              <p className="text-sm text-[var(--text-muted)]">{option.text}</p>
            </div>
            <Button
              disabled={close.isPending}
              loading={close.isPending && close.variables === option.accion}
              onClick={() => close.mutate(option.accion)}
              variant={option.primary ? 'primary' : 'secondary'}
            >
              {option.accion === 'REPEAT' ? 'Repetir' : option.accion === 'CHOOSE_OTHER' ? 'Elegir otra' : 'Apagar'}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
