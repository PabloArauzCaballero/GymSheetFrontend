import { Redirect, Tabs } from 'expo-router';
import { useAuthStore } from '@/state/auth-store';
import { colors } from '@/theme';

export default function AppLayout() {
  const status = useAuthStore((state) => state.status);

  // Protect the entire private group from unauthenticated access.
  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.volt,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surfaceLow, borderTopColor: colors.borderSubtle },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}
