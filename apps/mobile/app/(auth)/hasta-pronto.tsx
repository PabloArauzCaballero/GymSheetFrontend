import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { goodbyeCopy } from '@gymsheet/domain';
import { BrandEmblem } from '@/components/auth-shell';
import { ScrollScreen } from '@/components/layout';
import { EnterUp } from '@/components/motion';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/state/auth-store';
import { spacing } from '@/theme';

/**
 * Where a closed account lands. The session and every local copy are already
 * gone (`endClosedAccount`); this only says so, plainly, and offers the way
 * back to the login. No undo: the server closure is final.
 */
export default function GoodbyeScreen() {
  const router = useRouter();
  const dismiss = useAuthStore((state) => state.dismissFarewell);

  return (
    <ScrollScreen center>
      <EnterUp index={0} style={{ gap: spacing.md, alignItems: 'flex-start' }}>
        <BrandEmblem />
        <Text accessibilityRole="header" variant="display">{goodbyeCopy.title}</Text>
        <Text tone="secondary">{goodbyeCopy.description}</Text>
        <Text tone="muted" variant="footnote">
          Tu correo queda libre: si vuelves, puedes crear una cuenta nueva con él.
        </Text>
      </EnterUp>
      <View style={{ marginTop: spacing.lg }}>
        <Button
          label={goodbyeCopy.action}
          onPress={() => {
            dismiss();
            router.replace('/(auth)/login');
          }}
        />
      </View>
    </ScrollScreen>
  );
}
