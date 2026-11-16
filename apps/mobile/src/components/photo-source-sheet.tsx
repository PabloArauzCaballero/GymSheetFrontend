import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { afterSheetCloses } from '@/components/after-sheet-closes';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/ui';
import { spacing } from '@/theme';

export type PhotoSource = 'camera' | 'library';

/**
 * Where the profile photo comes from: same title, copy and «Elegir una imagen» as the web dialog
 * (`MediaSourceDialog`), each choice a full-width row. The system picker opens only once the sheet is
 * gone (`afterSheetCloses`).
 */
export function PhotoSourceSheet({
  busy,
  onClose,
  onPick,
  visible,
}: {
  busy: boolean;
  onClose: () => void;
  onPick: (source: PhotoSource) => void;
  visible: boolean;
}) {
  const latestPick = useRef(onPick);
  useEffect(() => {
    latestPick.current = onPick;
  }, [onPick]);
  const [queue] = useState(() => afterSheetCloses<PhotoSource>(Platform.OS, (source) => latestPick.current(source)));
  const choose = (source: PhotoSource) => {
    onClose();
    queue.choose(source);
  };
  return (
    <BottomSheet
      onClose={onClose}
      onDismiss={queue.dismissed}
      subtitle="Aparecerá en tu ficha del directorio y en la baraja de Descubrir."
      testID="photo-source-sheet"
      title="Añadir una foto"
      visible={visible}
    >
      <View style={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
        <Button disabled={busy} icon="camera-outline" label="Hacer una foto" onPress={() => choose('camera')} variant="ghost" />
        <Button disabled={busy} icon="images-outline" label="Elegir una imagen" onPress={() => choose('library')} variant="ghost" />
      </View>
    </BottomSheet>
  );
}
