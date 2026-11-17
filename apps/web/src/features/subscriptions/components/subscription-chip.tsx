import { subscriptionChip } from '@gymsheet/domain';
import type { SubscriptionLineStatus } from '@/shared/api/schemas';
import { Badge } from '@/shared/components/ui/badge';

/** Where a plan stands, in a word. The tone never carries it alone. */
export function SubscriptionChip({ status }: Readonly<{ status: SubscriptionLineStatus }>) {
  const chip = subscriptionChip(status);
  return <Badge tone={chip.tone}>{chip.label}</Badge>;
}
