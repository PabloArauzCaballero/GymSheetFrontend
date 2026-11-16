import { noticeActionLabel, noticeDestination, type NoticeDestination } from '@gymsheet/domain';

/** Screen of each notice destination: the export notices open Privacidad y datos. */
const routes = { 'account-export': '/datos-privacidad' } as const satisfies Record<NoticeDestination, string>;

export type NoticeRoute = (typeof routes)[NoticeDestination];

/** Where tapping a notice goes, with its button label; null for a plain notice. */
export function noticeRoute(notice: { tipo?: string | null }): { href: NoticeRoute; label: string } | null {
  const destination = noticeDestination(notice);
  const label = noticeActionLabel(notice);
  return destination && label ? { href: routes[destination], label } : null;
}
