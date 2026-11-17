import { Redirect, Stack, usePathname } from 'expo-router';
import { homeFor } from '@/features/business/business-routing';
import { isReadingLegalDocument } from '@/features/legal/legal-logic';
import { useAuthStore } from '@/state/auth-store';

export default function AuthLayout() {
  const status = useAuthStore((state) => state.status);
  const principal = useAuthStore((state) => state.principal);
  const pathname = usePathname();

  // Never show auth screens to an already-authenticated user, except the two
  // legal documents: the legal gate opens them for a signed-in person.
  if (status === 'authenticated' && !isReadingLegalDocument(pathname)) {
    // The destination comes from the shared package, after login and signup
    // alike: the onboarding guard in `(app)/_layout.tsx` then sends a CLIENTE
    // with unfinished onboarding to `/onboarding` (single source of truth).
    // A business account (ADR-0020) goes to its own shell, which resumes its signup.
    return <Redirect href={homeFor(principal)} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
