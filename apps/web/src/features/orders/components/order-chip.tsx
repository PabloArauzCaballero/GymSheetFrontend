import { businessOrderChip, buyerOrderChip } from '@gymsheet/domain';
import type { OrderMethod, OrderStatus } from '@/shared/api/schemas';
import { Badge } from '@/shared/components/ui/badge';

/** Where an order stands, in a word, for the person or for the business. The tone never carries it alone. */
export function OrderChip({ order, side }: Readonly<{ order: { status: OrderStatus; method: OrderMethod }; side: 'buyer' | 'business' }>) {
  const chip = side === 'buyer' ? buyerOrderChip(order) : businessOrderChip(order);
  return <Badge tone={chip.tone}>{chip.label}</Badge>;
}
