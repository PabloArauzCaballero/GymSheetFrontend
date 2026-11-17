/**
 * Channel the backend stores with every device, session and legal acceptance
 * (`client-device-context.ts`). The BFF is the web client, so it always says web.
 */
export const CLIENT_PLATFORM_HEADER = 'X-Client-Platform';
export const WEB_CLIENT_PLATFORM = 'web';
