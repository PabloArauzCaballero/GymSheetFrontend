import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import {
  WEEKDAYS,
  WEEKDAY_INITIALS,
  WEEKDAY_NAMES,
  summarizeStructure,
  type Weekday,
} from '@gymsheet/hooks';
import { Section } from '@/components/layout';
import { Button } from '@/components/ui';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import { WeekStrip } from '@/components/wizard/week-strip';
import { WizardActionBar } from '@/components/wizard/wizard-action-bar';
import { WizardShell } from '@/components/wizard/wizard-shell';
import { useRoutineDraft } from '@/features/routine-wizard/use-wizard';
import { dayPath } from '@/lib/wizard-routes';
import { colors, fontSizes, spacing } from '@/theme';

/**
 * Paso 5: qué días se entrena y qué se hace cada uno.
 *
 * Elegir los días y editarlos viven en la misma pantalla para que el resumen
 * («4 días · 12 semanas») y la semana se vean cambiar a la vez.
 */
export function DaysStep() {
  const { state, draft, dispatch, errors, next } = useRoutineDraft();
  const { seleccion } = state;
  const selecting = seleccion !== null;
  const dayError = errors(4).dias;

  const toggleDay = (dia: Weekday) => {
    const day = draft.dias.find((candidate) => candidate.diaSemana === dia);
    if (day && day.ejercicios.length > 0) {
      Alert.alert(
        `¿Quitar el ${WEEKDAY_NAMES[dia].toLowerCase()}?`,
        `Se perderán sus ${day.ejercicios.length} ejercicios.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Quitar',
            style: 'destructive',
            onPress: () => dispatch({ type: 'alternarDia', dia }),
          },
        ],
      );
      return;
    }
    dispatch({ type: 'alternarDia', dia });
  };

  const actions = selecting ? (
    <WizardActionBar
      info={
        seleccion.length === 0
          ? 'Toca los días que quieras configurar juntos'
          : `${seleccion.length} ${seleccion.length === 1 ? 'día seleccionado' : 'días seleccionados'}`
      }
      primary={{
        label: 'Configurar juntos',
        disabled: seleccion.length === 0,
        onPress: () => {
          dispatch({ type: 'iniciarGrupo' });
          router.push(dayPath('grupo'));
        },
      }}
      secondary={{
        label: 'Cancelar',
        onPress: () => dispatch({ type: 'salirSeleccion' }),
      }}
    />
  ) : (
    <WizardActionBar
      info={draft.dias.length > 0 ? summarizeStructure(draft) : undefined}
      primary={{
        label: 'Siguiente',
        disabled: draft.dias.length === 0,
        onPress: () => next(4),
      }}
    />
  );

  return (
    <WizardShell
      actions={actions}
      paso={4}
      subtitle="Elige los días y toca cada uno para añadir sus ejercicios."
      title="¿Qué días entrenas?"
    >
      <Section icon="calendar-outline" index={0} title="Días de entrenamiento">
        <View
          accessibilityLabel="Días de la semana"
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
        >
          {WEEKDAYS.map((dia) => (
            <ChoiceChip
              accessibilityLabel={WEEKDAY_NAMES[dia]}
              key={dia}
              label={WEEKDAY_INITIALS[dia]}
              onSelect={() => toggleDay(dia)}
              selected={draft.dias.some((day) => day.diaSemana === dia)}
              testID={`weekday-${dia}`}
            />
          ))}
        </View>
        {dayError || draft.dias.length === 0 ? (
          <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: fontSizes.xs }}>
            Elige al menos un día
          </Text>
        ) : null}
      </Section>

      {draft.dias.length > 0 ? (
        <Section icon="barbell-outline" index={1} title="Tu semana">
          {selecting ? null : (
            <Button
              icon="checkbox-outline"
              label="Seleccionar"
              onPress={() => dispatch({ type: 'entrarSeleccion' })}
              variant="ghost"
            />
          )}
          <WeekStrip
            dias={draft.dias}
            onEdit={(dia) => router.push(dayPath(dia))}
            onStartSelection={(dia) => dispatch({ type: 'entrarSeleccion', dia })}
            onToggle={(dia) => dispatch({ type: 'alternarSeleccion', dia })}
            seleccion={seleccion}
          />
          {selecting ? null : (
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
              Toca un día para editarlo. Mantén pulsado para elegir varios.
            </Text>
          )}
        </Section>
      ) : null}
    </WizardShell>
  );
}
