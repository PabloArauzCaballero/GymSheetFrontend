import { Fragment } from 'react';
import { deviceCopy } from '@gymsheet/domain';
import { ErrorState, RowsSkeleton } from '@/components/feedback';
import { Card, Divider, ScrollScreen, ScreenHeader } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { DeviceRow } from './device-row';
import { hasOtherDevices } from './devices-logic';
import { useDevices } from './use-devices';

export function DevicesScreen() {
  const { devices, askRevoke, askRevokeOthers, revokingId, revokingOthers } = useDevices();
  const list = devices.data ?? [];

  return (
    <ScrollScreen onRefresh={() => void devices.refetch()} refreshing={devices.isRefetching}>
      <BackLink fallbackHref="/settings" />
      <ScreenHeader detail subtitle={deviceCopy.description} title={deviceCopy.title} />

      {devices.isPending ? (
        <RowsSkeleton rows={3} thumb={24} />
      ) : devices.isError ? (
        <ErrorState error={devices.error} onRetry={() => void devices.refetch()} />
      ) : (
        <>
          <Card list>
            {list.map((device, index) => (
              <Fragment key={device.id}>
                {index > 0 ? <Divider /> : null}
                <DeviceRow
                  device={device}
                  onRevoke={(id, label) => void askRevoke(id, label)}
                  revoking={revokingId === device.id}
                />
              </Fragment>
            ))}
          </Card>
          {hasOtherDevices(list) ? (
            <Button
              disabled={revokingId !== null}
              icon="log-out-outline"
              label={deviceCopy.revokeOthers}
              loading={revokingOthers}
              onPress={() => void askRevokeOthers()}
              variant="danger"
            />
          ) : (
            <Text tone="muted" variant="footnote">Tu cuenta solo está abierta en este dispositivo.</Text>
          )}
        </>
      )}
    </ScrollScreen>
  );
}
