import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { ApiError } from '@gymsheet/api-client';
import {
  describeSaveError,
  evaluateQuality,
  monthColumns,
  planWeeks,
  saveRoutineDraft,
  summarizeStructure,
  toggledWeekChoice,
  type QualityIssue,
} from '@gymsheet/hooks';
import { routineBuilderService } from '@/api/services';
import { Card, Section } from '@/components/layout';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import { RoutineMonthGrid } from '@/components/wizard/routine-month-grid';
import { WizardActionBar } from '@/components/wizard/wizard-action-bar';
import { WizardShell } from '@/components/wizard/wizard-shell';
import { useRoutineDraft } from '@/features/routine-wizard/use-wizard';
import { GOAL_LABEL } from '@/lib/format';
import { notify } from '@/notifications';
import { goToWizardStep } from '@/lib/wizard-routes';
import { colors, fontSizes, iconSizes, semibold, spacing } from '@/theme';

function IssueRow({ issue, blocking }: { issue: QualityIssue; blocking: boolean }) {
  const tone = blocking ? colors.danger : colors.warning;
  return (
    <View accessibilityLabel={`${blocking ? 'Bloquea' : 'Aviso'}: ${issue.mensaje}`} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
      <Ionicons
        accessibilityElementsHidden
        color={tone}
        importantForAccessibility="no-hide-descendants"
        name={blocking ? 'close-circle' : 'alert-circle'}
        size={iconSizes.md}
      />
      <Text style={{ flex: 1, color: colors.text, fontSize: fontSizes.sm, lineHeight: 20 }}>
        {issue.mensaje}
      </Text>
    </View>
  );
}

/** Paso 6: vista Mes con la progresión, avisos de calidad y guardado. */
export function ReviewStep() {
  const { draft, dispatch } = useRoutineDraft();
  const queryClient = useQueryClient();
  const [week, setWeek] = useState<number | null>(null);

  const quality = useMemo(() => evaluateQuality(draft), [draft]);
  const weeks = useMemo(() => planWeeks(draft), [draft]);
  const columns = useMemo(() => monthColumns(draft), [draft]);

  const save = useMutation({
    mutationFn: () =>
      saveRoutineDraft(routineBuilderService, draft, (routineId) =>
        dispatch({ type: 'guardado', routineId }),
      ),
    onSuccess: async ({ routine, semanasFallidas }) => {
      await queryClient.invalidateQueries({ queryKey: ['routines'] });
      if (semanasFallidas.length > 0) {
        notify.warning(
          `Rutina guardada, pero no pudimos ajustar las semanas ${semanasFallidas.join(', ')}.`,
        );
      } else {
        notify.success('Rutina creada.');
      }
      dispatch({ type: 'reiniciar' });
      router.dismissAll();
      router.push({ pathname: '/routines/[id]', params: { id: routine.id } });
    },
    onError: (error) => {
      const view = describeSaveError(
        error instanceof ApiError ? error : { message: 'Ocurrió un error inesperado.' },
      );
      notify.error({ title: view.titulo, message: view.mensaje });
      if (view.paso !== undefined) goToWizardStep(view.paso);
    },
  });

  const selectedWeek = week === null ? null : weeks.find((candidate) => candidate.numero === week);

  return (
    <WizardShell
      actions={
        <WizardActionBar
          info={quality.bloqueos.length > 0 ? 'Resuelve lo marcado para guardar' : summarizeStructure(draft)}
          primary={{
            label: 'Guardar',
            disabled: quality.bloqueos.length > 0,
            loading: save.isPending,
            onPress: () => save.mutate(),
          }}
        />
      }
      paso={5}
      subtitle="Revisa la progresión y los avisos antes de guardar."
      title="Revisión"
    >
      <Card>
        <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: semibold }}>
          {draft.nombre.trim()}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
          {[draft.objetivo ? GOAL_LABEL[draft.objetivo] : null, summarizeStructure(draft), 'Privada']
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </Card>

      {quality.bloqueos.length + quality.avisos.length > 0 ? (
        <Section icon="shield-checkmark-outline" index={0} title="Avisos">
          <Card>
            {quality.bloqueos.map((issue) => (
              <IssueRow blocking issue={issue} key={`${issue.codigo}-${issue.dia}`} />
            ))}
            {quality.avisos.map((issue) => (
              <IssueRow blocking={false} issue={issue} key={`${issue.codigo}-${issue.mensaje}`} />
            ))}
          </Card>
        </Section>
      ) : null}

      <Section icon="calendar-number-outline" index={1} title="Vista Mes">
        <RoutineMonthGrid
          columnas={columns}
          onSelectWeek={(numero) => setWeek(week === numero ? null : numero)}
          seleccionada={week}
          semanas={weeks}
        />
        {selectedWeek ? (
          <Card>
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: semibold }}>
              {`Semana ${selectedWeek.numero}`}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {(['DESCARGA', 'NORMAL'] as const).map((choice) => (
                <ChoiceChip
                  key={choice}
                  label={choice === 'DESCARGA' ? 'Descarga' : 'Normal'}
                  onSelect={() => {
                    const wantsDeload = choice === 'DESCARGA';
                    if (wantsDeload !== selectedWeek.esDescarga) {
                      dispatch({
                        type: 'ajustarSemana',
                        numero: selectedWeek.numero,
                        eleccion: toggledWeekChoice(draft, selectedWeek.numero),
                      });
                    }
                  }}
                  selected={choice === 'DESCARGA' ? selectedWeek.esDescarga : !selectedWeek.esDescarga}
                  testID={`week-${choice === 'DESCARGA' ? 'deload' : 'normal'}`}
                />
              ))}
            </View>
          </Card>
        ) : (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
            Toca una semana para marcarla como descarga o normal.
          </Text>
        )}
      </Section>
    </WizardShell>
  );
}
