import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/state/auth-store';

export default function AuthLayout() {
  const status = useAuthStore((state) => state.status);

  // Never show auth screens to an already-authenticated user.
  if (status === 'authenticated') {
    return <Redirect href="/(app)/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
