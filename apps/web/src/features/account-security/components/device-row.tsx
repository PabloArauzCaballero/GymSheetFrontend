import { deviceCopy, deviceLabel } from '@gymsheet/domain';
import { Monitor, Smartphone } from 'lucide-react';
import type { UserDevice } from '@/shared/api/schemas';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { formatRelativeTime } from '@/shared/lib/relative-time';

/** One device: what it is, when it was last used and, if it is not this one, how to sign it out. */
export function DeviceRow({
  device,
  onRevoke,
  revoking,
}: Readonly<{ device: UserDevice; onRevoke: (device: UserDevice) => void; revoking: boolean }>) {
  const Icon = device.platform === 'WEB' ? Monitor : Smartphone;
  const label = deviceLabel(device);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <Icon aria-hidden className="size-5 shrink-0 text-[var(--text-muted)]" />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="t-subhead min-w-0 break-words font-medium">{label}</span>
          {device.current ? <Badge tone="success">{deviceCopy.current}</Badge> : null}
        </span>
        <span className="text-[13px] text-[var(--text-muted)]">
          {deviceCopy.lastSeen(formatRelativeTime(device.lastSeenAt))}
        </span>
      </div>
      {device.current ? null : (
        <Button
          aria-label={`${deviceCopy.revoke}: ${label}`}
          loading={revoking}
          onClick={() => onRevoke(device)}
          size="sm"
          variant="ghost"
        >
          {deviceCopy.revoke}
        </Button>
      )}
    </li>
  );
}
