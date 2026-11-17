import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  buildDeviceHeaders,
  generateInstallationId,
  isInstallationId,
  runtimeRandomSources,
} from './device-headers';

/**
 * Survives logout on purpose: it names the installation, not the session, so
 * «Dispositivos» keeps one row per phone instead of one per sign-in. Note that
 * the iOS Keychain also survives an uninstall, so on iOS a reinstall keeps it.
 */
const INSTALLATION_KEY = 'gymsheet.installationId';

async function installationId(): Promise<string | null> {
  try {
    const stored = await SecureStore.getItemAsync(INSTALLATION_KEY);
    if (isInstallationId(stored)) return stored;
    const fresh = generateInstallationId(runtimeRandomSources());
    await SecureStore.setItemAsync(INSTALLATION_KEY, fresh);
    return fresh;
  } catch {
    // Without the Keychain there is no stable id; the server assigns one.
    return null;
  }
}

/**
 * The OS version people recognise («14», «17.4»). `Platform.Version` is the API
 * level on Android (34), which `deviceLabel` would print as «Android 34»; it is
 * only the fallback when expo-device cannot tell.
 */
function osVersion(): string | null {
  return Device.osVersion ?? (Platform.Version === undefined ? null : String(Platform.Version));
}

let cached: Promise<Record<string, string>> | null = null;

/** Built once per launch: none of these values change while the app runs. */
export function deviceHeaders(): Promise<Record<string, string>> {
  cached ??= installationId().then((id) =>
    buildDeviceHeaders({
      installationId: id,
      appVersion: Constants.expoConfig?.version ?? null,
      osVersion: osVersion(),
      deviceModel: Device.modelName,
    }),
  );
  return cached;
}
