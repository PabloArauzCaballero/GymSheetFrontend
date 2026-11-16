import { Redirect, Stack, usePathname } from 'expo-router';
import { authDestination } from '@gymsheet/domain';
import { isReadingLegalDocument } from '@/features/legal/legal-logic';
import { useAuthStore } from '@/state/auth-store';

export default function AuthLayout() {
  const status = useAuthStore((state) => state.status);
  const pathname = usePathname();

  // Never show auth screens to an already-authenticated user, except the two
  // legal documents: the legal gate opens them for a signed-in person.
  if (status === 'authenticated' && !isReadingLegalDocument(pathname)) {
    // The destination comes from the shared package, after login and signup
    // alike: the onboarding guard in `(app)/_layout.tsx` then sends a CLIENTE
    // with unfinished onboarding to `/onboarding` (single source of truth).
    return <Redirect href={authDestination.mobile.afterLogin} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
