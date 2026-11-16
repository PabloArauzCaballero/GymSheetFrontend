import type { UserDevice } from '@gymsheet/schemas';
import { deviceCopy } from '@gymsheet/domain';
import { sinceLabel } from '../messages/since.ts';

/** Pure rules of «Dispositivos» (no React Native: runs under `node --test`). */

/** This device first, then the most recently active. */
export function sortDevices(devices: readonly UserDevice[]): UserDevice[] {
  return [...devices].sort((a, b) => {
    if (a.current !== b.current) return a.current ? -1 : 1;
    return Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt);
  });
}

/** «Última actividad: hace 2 h». */
export function lastSeenLabel(device: Pick<UserDevice, 'lastSeenAt'>, now?: Date): string {
  const since = sinceLabel(device.lastSeenAt, now);
  return deviceCopy.lastSeen(since.charAt(0).toLowerCase() + since.slice(1));
}

/** «Cerrar sesión en los demás» only makes sense when there is another device. */
export function hasOtherDevices(devices: readonly UserDevice[]): boolean {
  return devices.some((device) => !device.current);
}
