import { daysLeftText, formatMoney, sessionsText, subscriberFacts } from '@gymsheet/domain';
import type { Subscriber } from '@/shared/api/schemas';
import { PersonAvatar } from '@/shared/components/media/person-avatar';
import { formatDate } from '@/shared/lib/date';
import { SubscriptionChip } from '../subscription-chip';
import { SubscriberDecision } from './subscriber-decision';

/** One subscriber (plan §2.10): name, plan, sede, end, last payment. Never an email, id or CI. */
export function SubscriberRow({ row, today }: Readonly<{ row: Subscriber; today: string }>) {
  const days = daysLeftText(row);
  const sessions = sessionsText(row.sessions);
  const payment = row.lastPayment
    ? `Último pago ${formatMoney(row.lastPayment.amount, row.lastPayment.currency)}${row.lastPayment.paidAt ? ` · ${formatDate(row.lastPayment.paidAt)}` : ''}`
    : null;
  return (
    <li className="panel grid gap-4 px-5 py-4" data-status={row.status} data-testid="subscriber-row">
      <div className="flex items-start gap-4">
        <PersonAvatar name={row.subscriber.displayName} photoUrl={null} size="md" />
        <div className="grid min-w-0 flex-1 gap-1">
          <p className="truncate font-semibold">{row.subscriber.displayName}</p>
          <p className="t-subhead text-[var(--text-muted)]">{subscriberFacts(row, today)}</p>
          {sessions || payment ? <p className="t-footnote tabular-nums text-[var(--text-muted)]">{[sessions, payment].filter(Boolean).join(' · ')}</p> : null}
        </div>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <SubscriptionChip status={row.status} />
          {days ? <span className="t-footnote font-semibold tabular-nums">{days}</span> : null}
        </span>
      </div>
      <SubscriberDecision row={row} />
    </li>
  );
}
