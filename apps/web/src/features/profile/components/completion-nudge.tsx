import { noOrphan, pendingProfileItems, pointsChip, profileNudgeTitle, profileProgress } from '@gymsheet/domain';
import {
  Calendar,
  ChevronRight,
  CloudOff,
  Gauge,
  Heart,
  Image as ImageIcon,
  type LucideIcon,
  MessageSquareText,
  PersonStanding,
  Camera,
  RefreshCw,
  User,
} from 'lucide-react';
import Link from 'next/link';
import type { ProfileCompletion } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { editHrefFor } from '../lib/edit-routes';

/** Un glifo por dato: la lista se escanea por forma antes que por texto. */
export const PROFILE_ITEM_ICON: Record<string, LucideIcon> = {
  FOTO: Camera,
  FOTOS_3: ImageIcon,
  BIO: MessageSquareText,
  DATOS: PersonStanding,
  NIVEL: Gauge,
  INTERESES: Heart,
  NACIMIENTO: Calendar,
  GENERO: User,
};

/** Ficha «+50 pts»: tinta de acento sobre superficie, no relleno. */
export function PointsChip({ points }: Readonly<{ points: number }>) {
  return (
    <span className="t-footnote shrink-0 rounded-full bg-[var(--surface-highest)] px-2 py-0.5 font-semibold text-[var(--accent-ink)]">
      {`${pointsChip(points)} pts`}
    </span>
  );
}

/**
 * El empujón honesto (`completion-nudge` del móvil): los puntos que quedan, de
 * verdad, y qué dato da cada uno. Sale de `GET /me/progression/profile-completion`;
 * sin puntos pendientes no hay tarjeta.
 */
export function CompletionNudge({ completion }: Readonly<{ completion: ProfileCompletion }>) {
  const title = profileNudgeTitle(completion.pointsAvailable);
  const pending = pendingProfileItems(completion.items);
  if (!title || pending.length === 0) return null;
  const shown = pending.slice(0, 3);
  const rest = pending.length - shown.length;
  const progress = profileProgress(completion);

  return (
    <section aria-labelledby="profile-nudge-title" className="panel grid gap-4 p-5" data-testid="profile-nudge">
      <div className="grid gap-2">
        {/* Same break as the app: noOrphan, not text-balance (native has no balance, so the two wrapped differently). */}
        <h2 className="t-headline text-pretty" id="profile-nudge-title">
          {noOrphan(title)}
        </h2>
        <p className="t-footnote text-pretty text-[var(--text-muted)]">
          {`${progress.label}. Cada dato suma una vez y no se pierde.`}
        </p>
        <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-[var(--surface-highest)]">
          <span className="block h-full rounded-full bg-[var(--volt)]" style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
        </span>
      </div>
      <ul className="grid divide-y divide-[var(--border-subtle)]">
        {shown.map((item) => {
          const Icon = PROFILE_ITEM_ICON[item.code] ?? User;
          return (
            <li key={item.code}>
              <Link className="tap flex min-h-14 flex-wrap items-center gap-3 py-3 hover:opacity-90" href={editHrefFor(item.code)}>
                <Icon aria-hidden className="size-5 shrink-0 text-[var(--text-muted)]" />
                <span className="grid min-w-[min(100%,7rem)] flex-1 gap-0.5">
                  <span className="t-subhead text-balance font-semibold">{item.label}</span>
                  <span className="t-footnote text-pretty text-[var(--text-muted)]">{item.hint}</span>
                </span>
                <PointsChip points={item.points} />
              </Link>
            </li>
          );
        })}
      </ul>
      {rest > 0 ? (
        <Link className="t-subhead inline-flex min-h-11 items-center gap-1 font-semibold text-[var(--accent-ink)]" href="/profile/editar">
          {rest === 1 ? 'Ver 1 dato más' : `Ver ${rest} datos más`}
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      ) : null}
    </section>
  );
}

/**
 * The completion read failed: say so where the card would be, with a retry,
 * instead of hiding the card (an absent nudge reads as «nothing left to earn»).
 */
export function CompletionError({ onRetry, retrying }: Readonly<{ onRetry: () => void; retrying: boolean }>) {
  return (
    <section className="panel grid gap-4 p-5" data-testid="profile-completion-error" role="alert">
      <div className="flex items-start gap-3">
        <CloudOff aria-hidden className="mt-0.5 size-5 shrink-0 text-[var(--text-muted)]" />
        <div className="grid gap-0.5">
          <h2 className="t-headline text-pretty">{noOrphan('No pudimos cargar tu progreso')}</h2>
          <p className="t-footnote text-pretty text-[var(--text-muted)]">Tus puntos están a salvo. Vuelve a intentarlo en un momento.</p>
        </div>
      </div>
      <Button className="justify-self-start" loading={retrying} onClick={onRetry} size="sm" variant="secondary">
        <RefreshCw aria-hidden className="size-4" />
        Reintentar
      </Button>
    </section>
  );
}
