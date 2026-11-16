'use client';

import { ArrowRight } from 'lucide-react';
import { useSocialProfileDraft } from '@/features/social/hooks/use-social-profile-draft';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { notify } from '@/shared/notifications';
import { SocialProfileEditor, type SocialProfileSection } from './social-profile-editor';

const SECTIONS: { key: SocialProfileSection; title: string }[] = [
  { key: 'interests', title: 'Intereses' },
  { key: 'habits', title: 'Hábitos' },
  { key: 'orientation', title: 'Orientación' },
  { key: 'bio', title: 'Bio' },
];

/**
 * "Tu perfil de Conocer" on the profile page: the same editors as the
 * onboarding step, all at once, saved with one button. The link resumes the
 * guided step for whoever skipped it.
 */
export function ConocerProfileSection() {
  const { query, draft, setDraft, saveDraft, saving, orientationConsent } = useSocialProfileDraft();
  if (query.isError) {
    return <ErrorPanel message="No pudimos cargar tu perfil de Conocer." onRetry={() => void query.refetch()} />;
  }
  if (!draft) return <LoadingPanel rows={3} />;

  return (
    <Card className="scroll-mt-24" id="conocer">
      <CardHeader
        action={
          <ButtonLink href="/onboarding/conocer" size="sm" variant="ghost">
            Retomar Conocer
            <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
        }
        description="Lo que verán quienes te encuentren en Conocer. Todo es opcional."
        title="Tu perfil de Conocer"
      />
      <CardContent className="grid gap-8">
        {SECTIONS.map((section) => (
          <section aria-label={section.title} className="grid gap-3" key={section.key}>
            <h3 className="data-label text-[var(--text-muted)]">{section.title}</h3>
            <SocialProfileEditor
              draft={draft}
              onChange={setDraft}
              orientationConsent={orientationConsent}
              section={section.key}
            />
          </section>
        ))}
        <Button
          className="w-full"
          loading={saving}
          onClick={async () => {
            if (await saveDraft()) notify.success('Perfil de Conocer guardado.');
          }}
          variant="primary"
        >
          Guardar perfil de Conocer
        </Button>
      </CardContent>
    </Card>
  );
}
