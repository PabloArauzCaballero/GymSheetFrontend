'use client';

import { businessReportCopy } from '@gymsheet/domain';
import { Flag } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { ReportDialog } from '@/features/moderation/components/report-dialog';

export type Viewer = 'person' | 'business' | 'anonymous';

/**
 * «⋯ Reportar» on a public listing or business profile (person accounts; the
 * backend refuses anything not public with 404). Without a session it asks to
 * sign in and comes back here; a business account does not report others.
 */
export function ReportButton({
  viewer,
  targetKind,
  targetId,
  subjectName,
  returnTo,
}: Readonly<{ viewer: Viewer; targetKind: 'BUSINESS_LISTING' | 'BUSINESS_PROFILE'; targetId: string; subjectName: string; returnTo: string }>) {
  if (viewer === 'business') return null;
  if (viewer === 'anonymous') {
    return (
      <Link
        className="t-subhead inline-flex min-h-11 items-center gap-1.5 text-[var(--text-muted)] underline-offset-4 hover:text-[var(--text)] hover:underline"
        href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
      >
        <Flag aria-hidden className="size-4" />
        {businessReportCopy.signIn}
      </Link>
    );
  }
  return (
    <ReportDialog
      consequence={businessReportCopy.consequence}
      subjectName={subjectName}
      successMessage={businessReportCopy.sent}
      targetId={targetId}
      targetKind={targetKind}
      trigger={
        <Button aria-label={targetKind === 'BUSINESS_LISTING' ? businessReportCopy.listingTitle : businessReportCopy.profileTitle} size="sm" type="button" variant="ghost">
          <Flag aria-hidden className="size-4" />
          {businessReportCopy.action}
        </Button>
      }
    />
  );
}
