import { identityErrorMessage } from '@gymsheet/domain';

/** What a failed Google attempt tells the person (shared copy in `@gymsheet/domain`). */
export function googleErrorMessage(error: unknown): string {
  return identityErrorMessage('Google', error);
}
