import { View } from 'react-native';
import { ErrorState, Skeleton } from '@/components/feedback';
import { Card, ScrollScreen } from '@/components/layout';
import { EnterUp } from '@/components/motion';
import { BackLink } from '@/components/nav';
import { StepProgress } from '@/components/step-flow';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { spacing } from '@/theme';
import { BioStep, HabitsStep, OrientationStep } from './answer-steps';
import { CONOCER_STEPS } from './conocer-steps';
import { DiscoveryPreferencesEditor } from './discovery-preferences-editor';
import { InterestsStep } from './interests-step';
import { PhotosStep } from './photos-step';
import { useConocerFlow, type ConocerMode } from './use-conocer-flow';

/**
 * The optional "Conocer" step: six short questions after the questionnaire.
 * The same screen edits the answers from Perfil (`mode="perfil"`), so there is
 * one form, not two.
 */
export function ConocerFlowScreen({ mode, initialStep }: { mode: ConocerMode; initialStep: number }) {
  const flow = useConocerFlow(mode, initialStep);
  const { current, draft, update } = flow;
  const onboarding = mode === 'onboarding';

  const exit = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: onboarding ? 'flex-end' : 'space-between' }}>
      {onboarding ? null : <BackLink fallbackHref="/profile" />}
      {onboarding ? (
        <Button haptic="none" label="Saltar por ahora" loading={flow.leaving} onPress={flow.leave} size="sm" variant="ghost" />
      ) : null}
    </View>
  );

  if (flow.profile.isPending) {
    return (
      <ScrollScreen>
        {exit}
        <Skeleton height={56} />
        <Skeleton height={320} />
      </ScrollScreen>
    );
  }
  if (flow.profile.isError) {
    return (
      <ScrollScreen>
        {exit}
        <ErrorState error={flow.profile.error} onRetry={() => void flow.profile.refetch()} />
      </ScrollScreen>
    );
  }

  const primaryLabel = flow.isLast ? (onboarding ? 'Terminar' : 'Listo') : 'Siguiente';

  return (
    <ScrollScreen>
      {exit}
      <StepProgress current={flow.step} steps={CONOCER_STEPS} />

      {/* Remounted per step so the new question rises in: «you moved forward». */}
      <View key={current.key} style={{ gap: spacing.sm }}>
        <EnterUp index={0}>
          <Text tone="muted" variant="footnote">
            {`Paso ${flow.step + 1} de ${CONOCER_STEPS.length} · Opcional`}
          </Text>
        </EnterUp>
        <EnterUp index={1} style={{ gap: spacing.sm }}>
          <Text accessibilityRole="header" variant="display">{current.title}</Text>
          <Text tone="secondary" variant="subhead">{current.subline}</Text>
        </EnterUp>
      </View>

      {current.key === 'search' ? (
        // The preferences editor saves on its own button; saving moves on.
        <DiscoveryPreferencesEditor embedded onSaved={flow.advance} submitLabel="Guardar y seguir" />
      ) : (
        <Card style={{ gap: spacing.lg }}>
          {current.key === 'interests' ? (
            <InterestsStep onChange={(interests) => update({ interests })} selected={draft.interests} />
          ) : current.key === 'habits' ? (
            <HabitsStep draft={draft} onChange={update} />
          ) : current.key === 'orientation' ? (
            <OrientationStep draft={draft} error={flow.saveError} onChange={update} />
          ) : current.key === 'bio' ? (
            <BioStep draft={draft} error={flow.saveError} onChange={update} />
          ) : (
            <PhotosStep count={flow.photoCount} />
          )}
          <Button
            disabled={flow.isLast && flow.finishBlocked}
            icon={flow.isLast ? 'checkmark' : 'arrow-forward'}
            iconPosition={flow.isLast ? 'start' : 'end'}
            label={primaryLabel}
            loading={flow.busy && !flow.leaving}
            onPress={flow.next}
          />
          <Button icon="arrow-back" label="Atrás" onPress={flow.back} variant="ghost" />
        </Card>
      )}
    </ScrollScreen>
  );
}
