import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { deviceCopy } from '@gymsheet/domain';
import { userDevicesSchema } from '@gymsheet/schemas';
import { apiClient } from '@/api/client';
import { confirm, notify } from '@/notifications';
import { sortDevices } from './devices-logic';

const devicesKey = ['me', 'devices'] as const;

// 204 No Content on both writes; the client reads it as `{ data: null }`.
const devicesService = {
  list: () => apiClient.request('/me/devices', userDevicesSchema, { method: 'GET' }),
  revoke: (deviceId: string) =>
    apiClient.request(`/me/devices/${encodeURIComponent(deviceId)}`, z.null(), { method: 'DELETE' }),
  revokeOthers: () => apiClient.request('/me/devices/revoke-others', z.null(), { method: 'POST' }),
};

/** The account's devices and the two sign-out actions, each behind a confirmation. */
export function useDevices() {
  const queryClient = useQueryClient();
  const devices = useQuery({ queryKey: devicesKey, queryFn: devicesService.list, select: sortDevices });
  const refresh = () => queryClient.invalidateQueries({ queryKey: devicesKey });

  const revoke = useMutation({
    mutationFn: devicesService.revoke,
    onSuccess: async () => {
      await refresh();
      notify.success('Cerraste la sesión en ese dispositivo.');
    },
    onError: (error) => notify.error(error),
  });

  const revokeOthers = useMutation({
    mutationFn: devicesService.revokeOthers,
    onSuccess: async () => {
      await refresh();
      notify.success('Cerraste la sesión en los demás dispositivos.');
    },
    onError: (error) => notify.error(error),
  });

  const askRevoke = async (deviceId: string, label: string) => {
    const result = await confirm({
      title: deviceCopy.revoke,
      message: `Se cerrará tu sesión en ${label}.`,
      confirmLabel: deviceCopy.revoke,
      cancelLabel: 'Volver',
      severity: 'danger',
    });
    if (result.confirmed) revoke.mutate(deviceId);
  };

  const askRevokeOthers = async () => {
    const result = await confirm({
      title: deviceCopy.revokeOthers,
      message: deviceCopy.revokeOthersConfirm,
      confirmLabel: deviceCopy.revokeOthers,
      cancelLabel: 'Volver',
      severity: 'danger',
    });
    if (result.confirmed) revokeOthers.mutate();
  };

  return {
    devices,
    askRevoke,
    askRevokeOthers,
    revokingId: revoke.isPending ? revoke.variables : null,
    revokingOthers: revokeOthers.isPending,
  };
}
