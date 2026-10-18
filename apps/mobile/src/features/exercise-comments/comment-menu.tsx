import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import type { RoutineComment } from '@gymsheet/types';
import { EnterUp } from '@/components/motion';
import { Text } from '@/components/text';
import type { MoreAction } from '@/features/routine-detail/more-sheet';
import type { ReportTarget } from '@/features/routine-detail/report-sheet';
import { colors, iconSizes, radii, spacing } from '@/theme';

/**
 * Lo que se puede hacer con un comentario (mantener pulsado): responder, y
 * eliminar si es mío o denunciarlo si es de otra persona. La denuncia abre su
 * propia hoja, así que espera a que esta se cierre (`afterClose`): dos Modales
 * encadenados en iOS dejan el segundo sin presentarse.
 */
export function commentMenuActions(
  comment: RoutineComment | null,
  handlers: {
    onReply: (comment: RoutineComment) => void;
    onDelete: (id: string) => void;
    onReport: (target: ReportTarget) => void;
  },
): MoreAction[] {
  if (!comment) return [];
  return [
    { key: 'reply', label: 'Responder', icon: 'return-down-forward', onPress: () => handlers.onReply(comment) },
    comment.esMio
      ? {
          key: 'delete',
          label: 'Eliminar comentario',
          icon: 'trash-outline',
          destructive: true,
          onPress: () => handlers.onDelete(comment.id),
        }
      : {
          key: 'report',
          label: 'Denunciar comentario',
          icon: 'flag-outline',
          destructive: true,
          afterClose: true,
          onPress: () => handlers.onReport({ kind: 'COMMENT', id: comment.id, label: `Comentario de ${comment.autor.nombre}` }),
        },
  ];
}

/** Nadie ha comentado este ejercicio: invita a dejar el primer consejo. */
export function ExerciseCommentsEmpty({ compact = false }: { compact?: boolean }) {
  return (
    <EnterUp style={{ alignItems: 'center', gap: spacing.smd, paddingVertical: compact ? spacing.md : spacing.xl }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radii.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceHigh,
        }}
      >
        <Ionicons color={colors.textSecondary} name="chatbubbles-outline" size={iconSizes.lg} />
      </View>
      <Text style={{ textAlign: 'center' }} variant="headline">
        Sin comentarios todavía
      </Text>
      <Text style={{ textAlign: 'center', maxWidth: 280 }} tone="muted" variant="subhead">
        Comparte un consejo de técnica o pregunta tu duda.
      </Text>
    </EnterUp>
  );
}
