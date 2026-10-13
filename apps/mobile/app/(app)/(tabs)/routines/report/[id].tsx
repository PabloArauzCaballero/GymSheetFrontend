import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { routineService } from '@/api/services';
import { BackLink } from '@/components/nav';
import { Card, ScreenHeader, ScrollScreen } from '@/components/layout';
import { Button, Input } from '@/components/ui';
import { notify } from '@/notifications';
import { colors, fontSizes, minTouchTarget, radii, spacing } from '@/theme';

const reasons = [
  { label: 'Riesgo al entrenar', value: 'OTRO' },
  { label: 'Publicidad o engaño', value: 'SPAM' },
  { label: 'Contenido ofensivo', value: 'DISCURSO_DE_ODIO' },
] as const;

export default function ReportRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<(typeof reasons)[number]['value']>('OTRO');
  const [details, setDetails] = useState('');
  const report = useMutation({
    mutationFn: () => routineService.report(id, reason, `${reasons.find((item) => item.value === reason)?.label}: ${details.trim()}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['routines', 'public'] });
      notify.success('Reporte enviado para revisión.');
      router.back();
    },
    onError: (error: Error) => notify.error(error),
  });

  return (
    <ScrollScreen>
      <BackLink />
      <ScreenHeader title="Reportar rutina" subtitle="Un equipo del gimnasio revisará el contenido." />
      <Card>
        <View style={{ gap: spacing.sm }}>
          {reasons.map((item) => (
            <Pressable
              key={item.value}
              accessibilityRole="button"
              accessibilityState={{ selected: reason === item.value }}
              onPress={() => setReason(item.value)}
              style={{ minHeight: minTouchTarget, justifyContent: 'center', padding: spacing.md, borderRadius: radii.md, backgroundColor: reason === item.value ? colors.surfaceHigh : colors.surface }}
            >
              <Text style={{ color: colors.text, fontSize: fontSizes.md }}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <Input
          label="Cuéntanos qué ocurre"
          multiline
          maxLength={850}
          onChangeText={setDetails}
          value={details}
          placeholder="Describe el ejercicio o indicación que te preocupa."
        />
      </Card>
      <Button label="Enviar reporte" disabled={!details.trim()} loading={report.isPending} onPress={() => report.mutate()} />
    </ScrollScreen>
  );
}
