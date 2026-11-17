'use client';

import { deviceCopy, deviceLabel } from '@gymsheet/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MonitorSmartphone } from 'lucide-react';
import type { UserDevice } from '@/shared/api/schemas';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { Section } from '@/shared/components/mobile/section';
import { Button } from '@/shared/components/ui/button';
import { confirm, notify } from '@/shared/notifications';
import { accountKeys, accountService } from '../services/account-client';
import { DeviceRow } from './device-row';

/**
 * «Dispositivos» in Ajustes: where the account is open, with a way to close
 * any other one. The current device is signed out with «Cerrar sesión», not here.
 */
export function DevicesSection() {
  const queryClient = useQueryClient();
  const devices = useQuery({ queryKey: accountKeys.devices, queryFn: accountService.devices });
  const refresh = () => queryClient.invalidateQueries({ queryKey: accountKeys.devices });

  const revoke = useMutation({
    mutationFn: (device: UserDevice) => accountService.revokeDevice(device.id),
    onSuccess: async () => {
      notify.success('Sesión cerrada en ese dispositivo.');
      await refresh();
    },
    onError: (error: Error) => notify.error(error),
  });
  const revokeOthers = useMutation({
    mutationFn: () => accountService.revokeOtherDevices(),
    onSuccess: async () => {
      notify.success('Sesión cerrada en los demás dispositivos.');
      await refresh();
    },
    onError: (error: Error) => notify.error(error),
  });

  async function askRevoke(device: UserDevice) {
    const answer = await confirm({
      title: deviceCopy.revoke,
      message: `Se cerrará tu sesión en ${deviceLabel(device)}.`,
      severity: 'danger',
      confirmLabel: deviceCopy.revoke,
    });
    if (answer.confirmed) revoke.mutate(device);
  }

  async function askRevokeOthers() {
    const answer = await confirm({
      title: deviceCopy.revokeOthers,
      message: deviceCopy.revokeOthersConfirm,
      severity: 'danger',
      confirmLabel: deviceCopy.revokeOthers,
    });
    if (answer.confirmed) revokeOthers.mutate();
  }

  const others = devices.data?.filter((device) => !device.current) ?? [];

  return (
    <Section icon={MonitorSmartphone} title={deviceCopy.title}>
      <p className="t-subhead -mt-1 text-[var(--text-muted)]">{deviceCopy.description}</p>
      {devices.isLoading ? (
        <SkeletonList rows={2} variant="stacked" />
      ) : devices.isError ? (
        <ErrorPanel
          error={devices.error}
          message={devices.error.message}
          onRetry={() => void devices.refetch()}
        />
      ) : (
        <div className="panel grid gap-1 px-5 py-2">
          <ul aria-label={deviceCopy.title} className="divide-y divide-[var(--border)]">
            {(devices.data ?? []).map((device) => (
              <DeviceRow
                device={device}
                key={device.id}
                onRevoke={(target) => void askRevoke(target)}
                revoking={revoke.isPending && revoke.variables?.id === device.id}
              />
            ))}
          </ul>
          {others.length > 0 ? (
            <Button
              className="my-2 w-full"
              loading={revokeOthers.isPending}
              onClick={() => void askRevokeOthers()}
              variant="secondary"
            >
              {deviceCopy.revokeOthers}
            </Button>
          ) : null}
        </div>
      )}
    </Section>
  );
}
