import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/state/auth-store';
import { colors } from '@/theme';

/** Entry gate: waits for session hydration, then routes to the right group. */
export default function Index() {
  const status = useAuthStore((state) => state.status);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.volt} />
      </View>
    );
  }

  return <Redirect href={status === 'authenticated' ? '/(app)/home' : '/(auth)/login'} />;
}
