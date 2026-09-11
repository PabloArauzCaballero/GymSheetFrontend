import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import type { DiscoveryPassEntry, ProfileViewer } from '@gymsheet/schemas';
import { EnterUp, PressableScale } from '@/components/motion';
import { Button } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { TRAINING_GOAL_LABEL } from '@/lib/social-labels';
import {
  accentPolicy,
  colors,
  fontSizes,
  minTouchTarget,
  radii,
  semibold,
  spacing,
} from '@/theme';

const AVATAR_SIZE = 52;

/**
 * Tiempo relativo en castellano natural.
 *
 * No usa `Intl.RelativeTimeFormat`: Hermes lo incluye según cómo esté
 * compilado el binario, así que en algunos dispositivos devolvería
 * `undefined` y la fila se quedaría sin su dato. Y no reutiliza `relativeDay`
 * de `lib/format` porque esa función redondea a días —«Hoy», «Ayer»— y aquí lo
 * que distingue una visita de otra son las horas: una lista entera que ponga
 * «Hoy» no ordena nada.
 *
 * Más allá de una semana se cae a la fecha corta, que es lo que de verdad
 * informa: «hace 43 días» no se lee, «14 ago» sí.
 */
export function relativeMoment(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (minutes < 1) return 'ahora mismo';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  return formatDate(iso);
}

/** Objetivo y sucursal en una sola línea; si falta alguno, no queda el punto suelto. */
function contextLine(objetivo: string | null, branchName: string | null): string | null {
  const parts = [
    objetivo ? (TRAINING_GOAL_LABEL[objetivo] ?? objetivo) : null,
    branchName,
  ].filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(' · ') : null;
}

function Avatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      <Image
        contentFit="cover"
        source={{ uri: photoUrl }}
        style={{
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          borderRadius: radii.full,
          backgroundColor: colors.surfaceHigh,
        }}
        transition={200}
      />
    );
  }
  return (
    <View
      style={{
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceHigh,
      }}
    >
      <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
        {name.trim().charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

/** El cuerpo de una fila: avatar, nombre, contexto y lo que vaya a la derecha. */
function PersonLine({
  name,
  context,
  photoUrl,
  trailing,
}: {
  name: string;
  context: string | null;
  photoUrl: string | null;
  trailing: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: minTouchTarget,
      }}
    >
      <Avatar name={name} photoUrl={photoUrl} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          numberOfLines={1}
          style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}
        >
          {name}
        </Text>
        {context ? (
          <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
            {context}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

/**
 * Quién vio tu perfil.
 *
 * `viewCount` sólo se escribe cuando alguien volvió: «1 visita» en todas las
 * filas es ruido que no distingue nada, y la señal es justamente la repetición.
 */
export function ProfileViewerRow({
  viewer,
  onPress,
}: {
  viewer: ProfileViewer;
  onPress: () => void;
}) {
  const context = contextLine(viewer.objetivo, viewer.branchName);
  const repeat = viewer.viewCount > 1 ? `${viewer.viewCount} visitas` : null;
  const moment = relativeMoment(viewer.lastViewedAt);
  // Una sola etiqueta para toda la fila: con cuatro textos sueltos el lector de
  // pantalla obliga a recorrerlos uno a uno antes de saber si interesa abrirla.
  const label = [
    viewer.displayName,
    context,
    repeat,
    `última visita ${moment}`,
    viewer.isNew ? 'nuevo' : null,
  ]
    .filter(Boolean)
    .join('. ');

  // Sin animación de entrada, al revés que el resto de filas de esta pantalla:
  // ésta es la única lista paginada, `FlatList` desmonta lo que sale de
  // pantalla, y una entrada por montaje significa que cada fila vuelve a
  // aparecer con un fundido al desplazarse hacia arriba. Un listado que
  // parpadea al recorrerlo se lee como un fallo, no como acabado.
  return (
    <PressableScale
      accessibilityLabel={label}
      onPress={onPress}
      style={{ paddingVertical: spacing.xs }}
    >
      <PersonLine
        context={context}
        name={viewer.displayName}
        photoUrl={viewer.photoUrl}
        trailing={
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {viewer.isNew ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 2,
                  borderRadius: radii.full,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceHigh,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: radii.full,
                    backgroundColor: colors.volt,
                  }}
                />
                <Text style={{ color: colors.text, fontSize: fontSizes.xs, fontWeight: semibold }}>
                  Nuevo
                </Text>
              </View>
            ) : null}
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{moment}</Text>
            {repeat ? (
              <Text
                style={{
                  color: accentPolicy.quietLink,
                  fontSize: fontSizes.xs,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {repeat}
              </Text>
            ) : null}
          </View>
        }
      />
    </PressableScale>
  );
}

/**
 * Alguien que te descartó.
 *
 * Sin acciones y sin toque, a propósito. Enterarse de un «next» ya es bastante;
 * ofrecer al lado un botón para escribirle, o siquiera para mirar su perfil,
 * convierte el dato en una invitación a insistir. Se muestra porque el gimnasio
 * lo pidió, no para que sirva de lista de pendientes.
 */
export function PassReceivedRow({ entry, index }: { entry: DiscoveryPassEntry; index: number }) {
  const context = contextLine(entry.objetivo, entry.branchName);
  return (
    <EnterUp index={index}>
      <View
        accessible
        accessibilityLabel={[entry.displayName, context, formatDate(entry.passedAt)]
          .filter(Boolean)
          .join('. ')}
        style={{ paddingVertical: spacing.xs }}
      >
        <PersonLine
          context={context}
          name={entry.displayName}
          photoUrl={entry.photoUrl}
          trailing={
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
              {formatDate(entry.passedAt)}
            </Text>
          }
        />
      </View>
    </EnterUp>
  );
}

/**
 * Alguien a quien descartaste tú, con la marcha atrás.
 *
 * El botón va debajo y a todo el ancho en lugar de reducirse a un icono en la
 * fila: «Devolver a la baraja» sólo se entiende escrito entero, y un glifo de
 * flecha en una lista de gente se lee como «deshacer» sin decir el qué.
 */
export function PassSentRow({
  entry,
  index,
  undoing,
  onUndo,
}: {
  entry: DiscoveryPassEntry;
  index: number;
  undoing: boolean;
  onUndo: () => void;
}) {
  const context = contextLine(entry.objetivo, entry.branchName);
  return (
    <EnterUp index={index} style={{ gap: spacing.sm, paddingVertical: spacing.xs }}>
      <PersonLine
        context={context}
        name={entry.displayName}
        photoUrl={entry.photoUrl}
        trailing={
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
            {formatDate(entry.passedAt)}
          </Text>
        }
      />
      <Button
        icon="refresh-outline"
        label="Devolver a la baraja"
        loading={undoing}
        onPress={onUndo}
        variant="ghost"
      />
    </EnterUp>
  );
}

