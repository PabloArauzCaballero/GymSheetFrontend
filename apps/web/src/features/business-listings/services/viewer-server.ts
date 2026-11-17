import 'server-only';
import { accountKindOf } from '@gymsheet/domain';
import { getSession } from '@/shared/server/session';
import type { Viewer } from '../components/public/report-button';

/** Who is looking at a public marketplace page: it only decides whether «Reportar» shows (the backend authorizes). */
export async function marketplaceViewer(): Promise<Viewer> {
  const session = await getSession().catch(() => null);
  if (!session) return 'anonymous';
  return accountKindOf(session) === 'BUSINESS' ? 'business' : 'person';
}
