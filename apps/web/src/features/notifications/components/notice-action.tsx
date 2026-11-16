import { noticeActionLabel, noticeDestination } from '@gymsheet/domain';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Notification } from '@/shared/api/contracts';
import { accountExportHref } from '@/shared/lib/account-links';
import { buttonClasses } from '@/shared/components/ui/button';

const destinations = { 'account-export': accountExportHref } as const;

/** Where a notice opens, from its `tipo`: the export notices go to «Descargar mis datos». */
export function NoticeAction({ notice }: Readonly<{ notice: Pick<Notification, 'tipo'> }>) {
  const destination = noticeDestination(notice);
  const label = noticeActionLabel(notice);
  if (!destination || !label) return null;
  return (
    <Link className={`${buttonClasses('secondary', 'sm')} justify-self-start`} href={destinations[destination]}>
      {label}
      <ArrowRight aria-hidden className="size-4" />
    </Link>
  );
}
