import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { describeProposal, formatKg, multiplierLabel, proposalSize } from '@gymsheet/hooks';
import type { ProgramSessionBlock } from '@gymsheet/schemas';
import { programService, routineService } from '@/api/services';
import { BottomSheet } from '@/components/bottom-sheet';
import { Card } from '@/components/layout';
import { Button } from '@/components/ui';
import { notify } from '@/notifications';
import { colors, fontSizes, semibold, spacing } from '@/theme';

/** «Subir» / «Bajar» / «Mantener» de una sugerencia de la sobrecarga. */
const ACTION_COPY: Record<string, string> = {
  RAISE: 'Sube el peso',
  LOWER: 'Baja el peso',
  HOLD: 'Mantén el peso',
  GOAL_REACHED: '¡Meta lograda!',
  E1RM_UP: 'Tu marca estimada subió',
};

/**
 * Lo que dice el programa al terminar la sesión (RF-15, RF-16, RF-20): «+X por sobrecarga
 * (x1,4)», las sugerencias para la próxima y, si cambiaste algo respecto de la rutina, la hoja
 * «¿Actualizar tu rutina?».
 */
export function SessionProgramBlock({ workoutId, block }: { workoutId: string; block: ProgramSessionBlock }) {
  const queryClient = useQueryClient();
  const [sheet, setSheet] = useState(false);
  const [done, setDone] = useState(false);
  const active = useQuery({ queryKey: ['programs', 'active'], queryFn: () => programService.active() });
  const routineId = active.data?.fuerza?.rutinaId ?? null;
  const routine = useQuery({
    queryKey: ['routine', routineId],
    queryFn: () => routineService.get(routineId ?? ''),
    enabled: Boolean(routineId),
  });

  // La hoja la abre la persona desde la tarjeta: el resumen puede estar mostrando antes una
  // celebración (otra hoja nativa) y iOS no presenta dos a la vez.
  const hasProposal = block.cambiosRespectoRutina && proposalSize(block.propuesta) > 0;

  const apply = useMutation({
    mutationFn: () => programService.applyToRoutine(workoutId, block.propuesta),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['routine'] });
      await queryClient.invalidateQueries({ queryKey: ['programs'] });
      notify.success('Rutina actualizada.');
      setDone(true);
      setSheet(false);
    },
    onError: (error: Error) => notify.error(error),
  });

  const lines = describeProposal(block.propuesta, routine.data ?? null);

  return (
    <>
      <Card>
        <View style={{ gap: spacing.sm }} testID="session-program">
          <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>Tu programa</Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
            {block.sesionCuenta
              ? `Esta sesión cuenta: ${block.sesionesHechasSemana} de ${block.sesionesPlanSemana} de la semana${block.semana ? ` ${block.semana}` : ''}.`
              : (block.motivoNoCuenta ?? 'Esta sesión no cuenta para la semana.')}
          </Text>
          {block.bonusModo ? (
            <Text style={{ color: colors.volt, fontSize: fontSizes.md, fontWeight: semibold }} testID="mode-bonus">
              +{block.bonusModo.puntosPrevistos} por {block.modo === 'STRENGTH_GOALS' ? 'metas' : 'sobrecarga'} ({multiplierLabel(block.bonusModo.proximoMultiplicador)} al cumplir la semana)
            </Text>
          ) : null}
          {block.sugerencias.map((hint) => (
            <Text key={hint.ejercicioId} style={{ color: colors.text, fontSize: fontSizes.sm, lineHeight: 20 }}>
              {hint.ejercicioNombre ?? 'Ejercicio'}: {ACTION_COPY[hint.accion] ?? hint.accion}
              {hint.pesoSugeridoKg !== undefined ? ` → ${formatKg(hint.pesoSugeridoKg)} la próxima` : ''}
              {hint.marcaActualKg !== undefined ? ` (${formatKg(hint.marcaActualKg)})` : ''}
            </Text>
          ))}
          {hasProposal && !done ? (
            <>
              <Text style={{ color: colors.text, fontSize: fontSizes.sm, lineHeight: 20 }}>
                Hiciste cambios respecto de tu rutina. ¿Quieres guardarlos?
              </Text>
              <Button label="Revisar cambios en la rutina" onPress={() => setSheet(true)} />
            </>
          ) : null}
        </View>
      </Card>

      <BottomSheet
        onClose={() => setSheet(false)}
        subtitle="Cambiaste esto respecto de lo planeado."
        testID="update-routine-sheet"
        title="¿Actualizar tu rutina?"
        visible={sheet}
      >
        {lines.map((line) => (
          <Text key={line} style={{ color: colors.text, fontSize: fontSizes.sm, lineHeight: 20 }}>
            • {line}
          </Text>
        ))}
        <Button label="Actualizar" loading={apply.isPending} onPress={() => apply.mutate()} />
        <Button label="Solo esta vez" onPress={() => setSheet(false)} variant="ghost" />
      </BottomSheet>
    </>
  );
}
