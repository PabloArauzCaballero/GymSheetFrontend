import { useState } from 'react';
import { View } from 'react-native';
import type { Routine } from '@gymsheet/types';
import { Section } from '@/components/layout';
import { Button } from '@/components/ui';
import { CommunitySection } from '@/features/routine-detail/community-section';
import type { ReportTarget } from '@/features/routine-detail/report-sheet';
import { ShareSheet } from '@/features/routine-detail/share-sheet';
import { SharesSection } from '@/features/routine-detail/shares-section';
import { useRoutineActions } from '@/features/routine-detail/use-routine-actions';
import { spacing } from '@/theme';

/**
 * Lo social de una rutina: acciones (copiar, publicar, despublicar, denunciar),
 * «Compartida con» para las privadas propias y la comunidad (estrellas y
 * comentarios) para las públicas.
 */
export function DetailSocial({
  routine,
  actions,
  onReport,
}: {
  routine: Routine;
  actions: ReturnType<typeof useRoutineActions>;
  onReport: (target: ReportTarget) => void;
}) {
  const [sharing, setSharing] = useState(false);
  const isPublic = routine.visibilidad === 'PUBLIC';
  const own = routine.esMia;

  return (
    <>
      <Section icon="flash-outline" index={1} title="Acciones">
        <View style={{ gap: spacing.sm }}>
          {!own ? (
            <Button label="Copiar a Mías" loading={actions.copying} onPress={actions.copy} variant="ghost" />
          ) : null}
          {own && !isPublic ? (
            <Button label="Publicar" loading={actions.publishing} onPress={() => void actions.publish()} variant="ghost" />
          ) : null}
          {own && isPublic ? (
            <Button
              label="Despublicar"
              loading={actions.unpublishing}
              onPress={() => void actions.unpublish()}
              variant="ghost"
            />
          ) : null}
          {!own && isPublic ? (
            <Button
              label="Denunciar rutina"
              onPress={() => onReport({ kind: 'ROUTINE', id: routine.id, label: routine.nombre })}
              variant="ghost"
            />
          ) : null}
        </View>
      </Section>

      {own && !isPublic ? (
        <Section icon="people-outline" index={2} title="Compartida con">
          <SharesSection onShare={() => setSharing(true)} routineId={routine.id} />
          <ShareSheet
            onClose={() => setSharing(false)}
            routineId={routine.id}
            routineName={routine.nombre}
            visible={sharing}
          />
        </Section>
      ) : null}

      {isPublic ? (
        <Section icon="chatbubbles-outline" index={3} title="Comunidad">
          <CommunitySection onReport={onReport} routine={routine} />
        </Section>
      ) : null}
    </>
  );
}
