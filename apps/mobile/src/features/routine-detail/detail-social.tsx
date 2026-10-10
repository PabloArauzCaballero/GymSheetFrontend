import type { Routine } from '@gymsheet/types';
import { Section } from '@/components/layout';
import { CommunitySection } from '@/features/routine-detail/community-section';
import type { ReportTarget } from '@/features/routine-detail/report-sheet';
import { ShareSheet } from '@/features/routine-detail/share-sheet';
import { SharesSection } from '@/features/routine-detail/shares-section';

/**
 * Lo social de una rutina: «Compartida con» para las privadas propias y la
 * comunidad (estrellas y comentarios) para las públicas.
 *
 * Las acciones ya no viven aquí: «Guardar en mis rutinas» es el CTA principal
 * del detalle (antes había un «Copiar a Mías» duplicado en esta sección) y
 * publicar, despublicar y denunciar están en el menú ⋯.
 */
export function DetailSocial({
  routine,
  onReport,
  sharing,
  onShareOpen,
  onShareClose,
}: {
  routine: Routine;
  onReport: (target: ReportTarget) => void;
  /** La hoja de invitar está abierta (la abre «Compartir» del detalle). */
  sharing: boolean;
  onShareOpen: () => void;
  onShareClose: () => void;
}) {
  const isPublic = routine.visibilidad === 'PUBLIC';
  const own = routine.esMia;

  return (
    <>
      {own && !isPublic ? (
        <Section title="Compartida con">
          <SharesSection onShare={onShareOpen} routineId={routine.id} />
          <ShareSheet
            onClose={onShareClose}
            routineId={routine.id}
            routineName={routine.nombre}
            visible={sharing}
          />
        </Section>
      ) : null}

      {isPublic ? (
        <Section title="Comunidad">
          <CommunitySection onReport={onReport} routine={routine} />
        </Section>
      ) : null}
    </>
  );
}
