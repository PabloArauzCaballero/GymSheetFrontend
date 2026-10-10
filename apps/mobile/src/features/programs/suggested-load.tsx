import { useQuery } from '@tanstack/react-query';
import { Text } from 'react-native';
import { formatKg } from '@gymsheet/hooks';
import { programService } from '@/api/services';
import { useActivePrograms } from '@/features/programs/use-active-programs';
import { colors, fontSizes, semibold } from '@/theme';

/** Cargas sugeridas del programa de pesas activo, por ejercicio (`GET /programs/:id/next-loads`). */
export function useNextLoads() {
  const programs = useActivePrograms();
  const program = programs.data?.fuerza ?? null;
  const loads = useQuery({
    queryKey: ['programs', program?.id, 'next-loads'],
    queryFn: () => programService.nextLoads(program?.id ?? ''),
    enabled: Boolean(program) && program?.modo !== 'NONE',
  });
  return loads.data ?? null;
}

/** «Sugerido: 62,5 kg × 8–12» bajo el nombre del ejercicio dentro de la sesión (RF-15). */
export function SuggestedLoad({
  exerciseId,
  loads,
}: {
  exerciseId: string | undefined;
  loads: ReturnType<typeof useNextLoads>;
}) {
  const item = loads?.items.find((entry) => entry.ejercicioId === exerciseId);
  if (!item) return null;
  const reps = item.repsMin === item.repsMax ? `${item.repsMin}` : `${item.repsMin}–${item.repsMax}`;
  const text = item.pesoSugeridoKg > 0 ? `Sugerido: ${formatKg(item.pesoSugeridoKg)} × ${reps}` : `Objetivo: ${reps} reps`;
  return (
    <Text
      accessibilityLabel={`${text}${item.mensaje ? `. ${item.mensaje}` : ''}`}
      style={{ color: colors.accentInk, fontSize: fontSizes.sm, fontWeight: semibold }}
      testID={`suggested-${exerciseId}`}
    >
      {text}
      {item.mensaje ? ` · ${item.mensaje}` : ''}
    </Text>
  );
}
