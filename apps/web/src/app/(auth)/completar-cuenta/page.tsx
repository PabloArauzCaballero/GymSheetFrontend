import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { identitySignInCopy } from '@gymsheet/domain';
import { AuthFrame } from '@/features/auth/components/auth-frame';
import { GoogleCompletionForm } from '@/features/auth/components/google-completion-form';
import { publicEnv } from '@/shared/config/public-env';

export const metadata: Metadata = { title: identitySignInCopy.completeTitle };

/** Profile completion of a new Google identity. Without the client id the route does not exist. */
export default function CompleteAccountPage() {
  if (!publicEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID) notFound();
  return (
    <AuthFrame
      wide
      description={identitySignInCopy.completeDescription}
      eyebrow="Google"
      title={identitySignInCopy.completeTitle}
    >
      <GoogleCompletionForm />
    </AuthFrame>
  );
}
