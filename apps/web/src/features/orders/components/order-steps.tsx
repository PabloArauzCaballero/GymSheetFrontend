import { buyerOrderSteps, formatDateTime, timelineEntryText, type OrderStep } from '@gymsheet/domain';
import { Check, X } from 'lucide-react';
import type { BuyerOrderDetail, BusinessOrderDetail } from '@/shared/api/schemas';
import { cn } from '@/shared/lib/cn';

function Marker({ step, index }: Readonly<{ step: OrderStep; index: number }>) {
  const base = 'grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold';
  if (step.state === 'done') return <span className={cn(base, 'bg-[var(--success-bg)] text-[var(--success-text)]')}><Check aria-hidden className="size-4" /></span>;
  if (step.state === 'stopped') return <span className={cn(base, 'bg-[var(--danger-bg)] text-[var(--danger-text)]')}><X aria-hidden className="size-4" /></span>;
  if (step.state === 'current') return <span className={cn(base, 'bg-[var(--text)] text-[var(--background)]')}>{index + 1}</span>;
  return <span className={cn(base, 'border border-[var(--border)] text-[var(--text-muted)]')}>{index + 1}</span>;
}

const STATE_TEXT: Record<OrderStep['state'], string> = { done: 'hecho', current: 'ahora', upcoming: 'después', stopped: 'se detuvo aquí' };

/**
 * The buyer's track (plan §4.3) and, under it, every change with its date.
 * Each step says its state in words for screen readers; the mark is redundant.
 */
export function OrderSteps({ order }: Readonly<{ order: BuyerOrderDetail | BusinessOrderDetail }>) {
  const steps = buyerOrderSteps(order);
  return (
    <section aria-labelledby="order-steps" className="grid gap-4">
      <h2 className="sr-only" id="order-steps">Estado del pedido</h2>
      <ol className="m-0 grid list-none gap-3 p-0">
        {steps.map((step, index) => (
          <li aria-current={step.state === 'current' ? 'step' : undefined} className="flex items-center gap-3" key={step.key}>
            <Marker index={index} step={step} />
            <span className={cn('text-[17px]', step.state === 'upcoming' ? 'text-[var(--text-muted)]' : 'font-semibold')}>{step.label}</span>
            <span className="sr-only">({STATE_TEXT[step.state]})</span>
          </li>
        ))}
      </ol>
      {order.timeline.length > 0 ? (
        <details className="group rounded-[var(--radius-lg)] bg-[var(--surface)] px-4 py-3">
          <summary className="t-subhead min-h-11 cursor-pointer content-center font-semibold">Historial</summary>
          <ul className="m-0 mt-2 grid list-none gap-2 p-0">
            {order.timeline.map((entry) => (
              <li className="flex flex-wrap justify-between gap-x-4 text-[15px]" key={`${entry.status}-${entry.at}`}>
                <span>{timelineEntryText(entry, order.method)}</span>
                <time className="tabular-nums text-[var(--text-muted)]" dateTime={entry.at}>{formatDateTime(entry.at)}</time>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
