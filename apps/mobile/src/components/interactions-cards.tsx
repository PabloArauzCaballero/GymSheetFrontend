import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import type { GymDirectoryEntry } from '@gymsheet/schemas';
import { DirectoryCardFace } from '@/components/directory-card';
import { EnterUp } from '@/components/motion';
import { Button } from '@/components/ui';
import { accentPolicy, colors, fontSizes, iconSizes, radii, semibold, spacing } from '@/theme';

/**
 * Marco de una tarjeta de la rejilla.
 *
 * La cara la pinta `DirectoryCardFace`, que es la misma que reparte la baraja:
 * una persona se ve igual en Descubrir, en Comunidad y aquí, y así no hay tres
 * versiones de «cómo se ve alguien» que se desincronizan al cambiar una.
 */
function GridCardShell({
  children,
  entry,
  index,
  onOpenProfile,
}: {
  children: React.ReactNode;
  entry: GymDirectoryEntry;
  index: number;
  onOpenProfile?: () => void;
}) {
  const face = <DirectoryCardFace entry={entry} />;

  return (
    <EnterUp
      index={index}
      style={{
        flex: 1,
        borderRadius: radii.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surfaceLow,
      }}
    >
      {onOpenProfile ? (
        <Pressable accessibilityLabel={`Ver perfil de ${entry.displayName}`} onPress={onOpenProfile}>
          {face}
        </Pressable>
      ) : (
        face
      )}
      <View style={{ gap: spacing.sm, padding: spacing.sm }}>{children}</View>
    </EnterUp>
  );
}

/** Cuándo ocurrió, en pequeño y apagado: es contexto, no contenido. */
function TimeCaption({ text }: { text: string }) {
  return (
    <Text
      numberOfLines={1}
      style={{
        color: colors.textMuted,
        fontSize: fontSizes.xs,
        paddingHorizontal: spacing.xs,
      }}
    >
      {text}
    </Text>
  );
}

/**
 * Alguien que te dio like, con las dos salidas.
 *
 * «Conectar» es la acción primaria y la única con relleno de acento; descartar
 * es fantasma. No están al mismo nivel a propósito: la pantalla existe porque
 * alguien quiere conocerte, y un botón rojo del mismo peso al lado convierte
 * eso en un trámite de aprobación.
 */
export function LikeReceivedCard({
  entry,
  index,
  accepting,
  rejecting,
  matched,
  openingChat,
  onAccept,
  onReject,
  onOpenChat,
  onDismissMatch,
  onOpenProfile,
  timeLabel,
}: {
  entry: GymDirectoryEntry;
  index: number;
  accepting: boolean;
  rejecting: boolean;
  /** `true` sólo cuando el backend ya confirmó la conexión, nunca antes. */
  matched: boolean;
  openingChat: boolean;
  onAccept: () => void;
  onReject: () => void;
  onOpenChat: () => void;
  onDismissMatch: () => void;
  onOpenProfile: () => void;
  timeLabel: string;
}) {
  return (
    <GridCardShell entry={entry} index={index} onOpenProfile={onOpenProfile}>
      {matched ? (
        // La celebración ocurre en el sitio: la tarjeta que se acaba de
        // aceptar se convierte en el aviso, en vez de taparse la pantalla con
        // un modal que obliga a volver a buscar de quién se trataba.
        <EnterUp style={{ gap: spacing.sm }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xs,
            }}
          >
            <Ionicons color={accentPolicy.ink} name="heart" size={iconSizes.md} />
            <Text
              accessibilityLabel={`Ya estás conectado con ${entry.displayName}`}
              style={{ color: accentPolicy.ink, fontSize: fontSizes.sm, fontWeight: semibold }}
            >
              ¡Conectados!
            </Text>
          </View>
          <Button
            icon="chatbubble-outline"
            label="Abrir chat"
            loading={openingChat}
            onPress={onOpenChat}
          />
          <Button label="Listo" onPress={onDismissMatch} variant="ghost" />
        </EnterUp>
      ) : (
        <>
          <TimeCaption text={timeLabel} />
          <Button
            label="Conectar"
            loading={accepting}
            onPress={onAccept}
            // Mientras una de las dos decisiones viaja, la otra se apaga: la
            // solicitud es una sola y aceptarla y rechazarla a la vez es una
            // carrera que resuelve el servidor con un error confuso.
            disabled={rejecting}
          />
          <Button
            disabled={accepting}
            label="Descartar"
            loading={rejecting}
            onPress={onReject}
            variant="ghost"
          />
        </>
      )}
    </GridCardShell>
  );
}

/** Un like que enviaste tú: mientras siga pendiente, se puede retirar. */
export function LikeSentCard({
  entry,
  index,
  withdrawing,
  onWithdraw,
  onOpenProfile,
  timeLabel,
}: {
  entry: GymDirectoryEntry;
  index: number;
  withdrawing: boolean;
  onWithdraw: () => void;
  onOpenProfile: () => void;
  timeLabel: string;
}) {
  return (
    <GridCardShell entry={entry} index={index} onOpenProfile={onOpenProfile}>
      <TimeCaption text={timeLabel} />
      <Button
        label="Retirar"
        loading={withdrawing}
        onPress={onWithdraw}
        variant="ghost"
      />
    </GridCardShell>
  );
}
