import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { diffRoutineVersions } from '@gymsheet/hooks';
import type { Routine } from '@gymsheet/types';
import { routineService } from '@/api/services';
import { BottomSheet } from '@/components/bottom-sheet';
import { Skeleton } from '@/components/feedback';
import { Button } from '@/components/ui';
import { alpha, colors, fontSizes, radii, semibold, spacing } from '@/theme';

/**
 * «Hay una versión nueva de la original» (D2). Nunca se aplica sola: «Ver
 * cambios» lista lo añadido y quitado, «Aplicar» actualiza la copia (conserva su
 * nombre) e «Ignorar» oculta el aviso hasta la próxima visita.
 */
export function VersionBanner({
  routine,
  onApply,
  applying,
  onIgnore,
}: {
  routine: Routine;
  onApply: () => void;
  applying: boolean;
  onIgnore: () => void;
}) {
  const [open, setOpen] = useState(false);
  const source = useQuery({
    queryKey: ['routine', routine.basadaEnRutinaId, 'source'],
    queryFn: () => routineService.get(routine.basadaEnRutinaId ?? ''),
    enabled: open && Boolean(routine.basadaEnRutinaId),
  });
  const changes = source.data ? diffRoutineVersions(routine, source.data) : [];

  return (
    <View
      accessibilityRole="alert"
      style={{
        gap: spacing.sm,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: alpha(colors.warning, 0.4),
        backgroundColor: colors.surfaceLow,
        padding: spacing.md,
      }}
      testID="version-banner"
    >
      <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
        Hay una versión nueva de la original
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
        Tu copia no cambia hasta que la apliques.
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button label="Ver cambios" onPress={() => setOpen(true)} style={{ flex: 1 }} variant="ghost" />
        <Button label="Aplicar" loading={applying} onPress={onApply} style={{ flex: 1 }} />
      </View>
      <Button label="Ignorar" onPress={onIgnore} variant="ghost" />

      <BottomSheet
        onClose={() => setOpen(false)}
        subtitle="Lo que cambió en la original desde que la copiaste."
        testID="changes-sheet"
        title="Cambios de la versión nueva"
        visible={open}
      >
        {source.isPending ? <Skeleton height={80} /> : null}
        {source.isSuccess && changes.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
            Los cambios son de detalles que no alteran tus días ni ejercicios.
          </Text>
        ) : null}
        {changes.map((change) => (
          <Text
            key={change.texto}
            style={{ color: colors.text, fontSize: fontSizes.sm, lineHeight: 20 }}
          >
            {change.tipo.includes('NUEVO') ? '+ ' : change.tipo.includes('QUITADO') ? '− ' : '~ '}
            {change.texto}
          </Text>
        ))}
        <Button
          label="Aplicar cambios"
          loading={applying}
          onPress={() => {
            setOpen(false);
            onApply();
          }}
        />
      </BottomSheet>
    </View>
  );
}
