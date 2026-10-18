import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Switch, Text, TextInput, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { PressableScale } from '@/components/motion';
import { Button } from '@/components/ui';
import type { MessageAction } from '@/hooks/chat-message-actions';
import { initialsOf } from '@/lib/format';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

export function SheetRow({
  icon,
  label,
  hint,
  tint = colors.text,
  onPress,
  disabled,
  trailing,
  testID,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  tint?: string;
  onPress?: () => void;
  disabled?: boolean;
  trailing?: React.ReactNode;
  testID?: string;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityHint={hint}
      disabled={disabled || !onPress}
      haptic="none"
      onPress={onPress}
      scaleTo={0.98}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: minTouchTarget + 8,
        paddingHorizontal: spacing.md,
        borderRadius: radii.md,
        backgroundColor: colors.surfaceHigh,
        opacity: disabled ? 0.5 : 1,
      }}
      testID={testID}
    >
      <Ionicons color={tint} name={icon} size={iconSizes.md + 2} />
      <View style={{ flex: 1, paddingVertical: spacing.sm }}>
        <Text style={{ color: tint, fontSize: fontSizes.md }}>{label}</Text>
        {hint ? <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>{hint}</Text> : null}
      </View>
      {trailing}
    </PressableScale>
  );
}

/** El menú del «+»: lo que antes eran cinco iconos sueltos junto al campo de texto. */
export function AttachSheet({
  visible,
  onClose,
  onGallery,
  onCamera,
  onLocation,
  onTrainTogether,
}: {
  visible: boolean;
  onClose: () => void;
  onGallery: () => void;
  onCamera: () => void;
  onLocation: () => void;
  onTrainTogether: (() => void) | null;
}) {
  const pick = (action: () => void) => () => {
    onClose();
    // La hoja se cierra antes de que aparezca el selector del sistema: dos
    // modales a la vez en iOS dejan el segundo sin presentar.
    setTimeout(action, 350);
  };
  return (
    <BottomSheet onClose={onClose} title="Compartir" visible={visible}>
      <View style={{ gap: spacing.sm }}>
        <SheetRow icon="images-outline" label="Fotos y videos" onPress={pick(onGallery)} testID="chat-attach-gallery" />
        <SheetRow icon="camera-outline" label="Cámara" onPress={pick(onCamera)} testID="chat-attach-camera" />
        <SheetRow icon="location-outline" label="Ubicación" hint="Envía dónde estás ahora" onPress={pick(onLocation)} />
        {onTrainTogether ? (
          <SheetRow icon="barbell-outline" label="Entrenemos juntos" hint="Propón día, hora y lugar" onPress={pick(onTrainTogether)} />
        ) : null}
      </View>
    </BottomSheet>
  );
}

const ACTION_ROWS: Record<MessageAction, { icon: IconName; label: string; destructive?: boolean }> = {
  copy: { icon: 'copy-outline', label: 'Copiar' },
  edit: { icon: 'pencil-outline', label: 'Editar' },
  delete: { icon: 'trash-outline', label: 'Eliminar', destructive: true },
  report: { icon: 'flag-outline', label: 'Reportar', destructive: true },
};

/** Mantener pulsado un mensaje — Copiar · Editar · Eliminar · Reportar, como en WhatsApp. */
export function MessageActionsSheet({
  visible,
  preview,
  actions,
  onClose,
  onAction,
}: {
  visible: boolean;
  preview: string;
  actions: MessageAction[];
  onClose: () => void;
  onAction: (action: MessageAction) => void;
}) {
  return (
    <BottomSheet onClose={onClose} title="Mensaje" subtitle={preview} visible={visible}>
      <View style={{ gap: spacing.sm }}>
        {actions.map((action) => {
          const row = ACTION_ROWS[action];
          return (
            <SheetRow
              icon={row.icon}
              key={action}
              label={row.label}
              onPress={() => onAction(action)}
              testID={`chat-message-action-${action}`}
              tint={row.destructive ? colors.danger : colors.text}
            />
          );
        })}
      </View>
    </BottomSheet>
  );
}

/** «Eliminar para todos» solo aparece mientras el plazo de 60 h sigue abierto. */
export function DeleteMessageSheet({
  visible,
  canDeleteForEveryone,
  pending,
  onClose,
  onDelete,
}: {
  visible: boolean;
  canDeleteForEveryone: boolean;
  pending: boolean;
  onClose: () => void;
  onDelete: (scope: 'ME' | 'EVERYONE') => void;
}) {
  return (
    <BottomSheet
      onClose={onClose}
      subtitle={canDeleteForEveryone ? undefined : 'Solo se quitará de tu chat. La otra persona lo seguirá viendo.'}
      title="¿Eliminar mensaje?"
      visible={visible}
    >
      <View style={{ gap: spacing.sm }}>
        {canDeleteForEveryone ? (
          <SheetRow
            disabled={pending}
            icon="people-outline"
            label="Eliminar para todos"
            onPress={() => onDelete('EVERYONE')}
            testID="chat-delete-everyone"
            tint={colors.danger}
          />
        ) : null}
        <SheetRow
          disabled={pending}
          icon="person-outline"
          label="Eliminar para mí"
          onPress={() => onDelete('ME')}
          testID="chat-delete-me"
          tint={colors.danger}
        />
        {pending ? <ActivityIndicator color={colors.volt} /> : null}
      </View>
    </BottomSheet>
  );
}

/**
 * Info. del contacto: lo que antes era un lápiz pegado al nombre que convertía
 * la cabecera en un campo de texto. Aquí se cambia el apodo con su botón de
 * guardar y se decide, solo para esta persona, si se envían los vistos.
 */
export function ContactInfoSheet({
  visible,
  onClose,
  name,
  nickname,
  photoUrl,
  presence,
  online,
  savingNickname,
  onSaveNickname,
  receiptsEnabled,
  receiptsPending,
  onToggleReceipts,
  allChatsReceiptsEnabled,
  onToggleAllChatsReceipts,
  onChooseChats,
  onTrainTogether,
  onOpenProfile,
}: {
  visible: boolean;
  onClose: () => void;
  name: string;
  nickname: string | null;
  photoUrl: string | null;
  presence: string;
  online: boolean;
  savingNickname: boolean;
  onSaveNickname: (nickname: string | null) => void;
  receiptsEnabled: boolean | undefined;
  receiptsPending: boolean;
  onToggleReceipts: (enabled: boolean) => void;
  allChatsReceiptsEnabled: boolean | undefined;
  onToggleAllChatsReceipts: () => void;
  onChooseChats: () => void;
  onTrainTogether: (() => void) | null;
  onOpenProfile: (() => void) | null;
}) {
  const [draft, setDraft] = useState(nickname ?? '');
  useEffect(() => {
    if (visible) setDraft(nickname ?? '');
  }, [nickname, visible]);
  const trimmed = draft.trim();
  const nicknameChanged = trimmed !== (nickname ?? '');

  return (
    <BottomSheet onClose={onClose} title="Info. del contacto" visible={visible}>
      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        {photoUrl ? (
          <Image
            cachePolicy="memory-disk"
            contentFit="cover"
            recyclingKey={photoUrl}
            source={{ uri: photoUrl }}
            style={{ width: 88, height: 88, borderRadius: radii.full, backgroundColor: colors.surfaceHigh }}
          />
        ) : (
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.volt,
            }}
          >
            <Text style={{ color: colors.background, fontSize: fontSizes.xl, fontWeight: '700' }}>
              {initialsOf(name, undefined)}
            </Text>
          </View>
        )}
        <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: semibold }}>{nickname ?? name}</Text>
        {nickname ? <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{name}</Text> : null}
        <Text style={{ color: online ? colors.success : colors.textMuted, fontSize: fontSizes.xs }}>{presence}</Text>
      </View>

      <View style={{ gap: spacing.xs }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, fontWeight: semibold, textTransform: 'uppercase' }}>
          Apodo (solo lo ves tú)
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TextInput
            accessibilityLabel="Apodo"
            keyboardAppearance="dark"
            maxLength={60}
            onChangeText={setDraft}
            onSubmitEditing={() => nicknameChanged && onSaveNickname(trimmed || null)}
            placeholder={name}
            placeholderTextColor={colors.textDisabled}
            returnKeyType="done"
            style={{
              flex: 1,
              minHeight: minTouchTarget + 4,
              paddingHorizontal: spacing.md,
              borderRadius: radii.md,
              backgroundColor: colors.surfaceHigh,
              color: colors.text,
              fontSize: fontSizes.md,
            }}
            value={draft}
          />
          <Button
            disabled={!nicknameChanged}
            label="Guardar"
            loading={savingNickname}
            onPress={() => onSaveNickname(trimmed || null)}
            size="sm"
          />
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <SheetRow
          hint={
            receiptsEnabled
              ? 'Esta persona ve cuándo lees sus mensajes (si ella también los tiene activos).'
              : 'Ni tú ni esta persona verán el doble check azul en este chat.'
          }
          icon="checkmark-done-outline"
          label="Confirmación de lectura"
          testID="chat-contact-receipts"
          trailing={
            receiptsEnabled === undefined ? (
              <ActivityIndicator color={colors.volt} />
            ) : (
              <Switch
                accessibilityLabel="Confirmación de lectura en este chat"
                disabled={receiptsPending}
                onValueChange={onToggleReceipts}
                thumbColor={colors.text}
                trackColor={{ false: colors.surfaceLow, true: colors.volt }}
                value={receiptsEnabled}
              />
            )
          }
        />
        <SheetRow
          disabled={allChatsReceiptsEnabled === undefined || receiptsPending}
          hint="Cambia el visto en todas tus conversaciones"
          icon="chatbubbles-outline"
          label={allChatsReceiptsEnabled ? 'Desactivar en todos los chats' : 'Activar en todos los chats'}
          onPress={onToggleAllChatsReceipts}
        />
        <SheetRow
          disabled={allChatsReceiptsEnabled === undefined}
          hint="Activa o desactiva el visto en varios chats a la vez"
          icon="list-outline"
          label="Elegir chats…"
          onPress={onChooseChats}
        />
        {onTrainTogether ? (
          <SheetRow icon="barbell-outline" label="Entrenemos juntos" onPress={onTrainTogether} />
        ) : null}
        {onOpenProfile ? <SheetRow icon="person-circle-outline" label="Ver perfil" onPress={onOpenProfile} /> : null}
      </View>
    </BottomSheet>
  );
}
