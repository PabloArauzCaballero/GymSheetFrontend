import { describe, expect, it } from 'vitest';
import { applicationServerKeyFrom, normalizeSubscription } from './web-push-subscription';

/**
 * Clave pública VAPID con la forma real —65 bytes en base64url, sin relleno y
 * con `-`/`_`—, generada al vuelo y desechada: no es la de ningún despliegue.
 * Una clave pública es pública por definición (el navegador la recibe entera),
 * pero un fixture que no corresponde a ninguna privada no admite dudas.
 */
const VAPID_PUBLIC_KEY =
  'BDsENtedk7elxhypqEEk-2OvG7gv21g9Dbp0UKjOW-Rx1mINbMM1h0m2AtLNkZVF4A1z2qSLSwf_QvlOAuly-b0';

function fakeSubscription(json: PushSubscriptionJSON): PushSubscription {
  return { toJSON: () => json } as unknown as PushSubscription;
}

describe('applicationServerKeyFrom', () => {
  it('decodes a base64url VAPID key into the 65 bytes of an uncompressed P-256 point', () => {
    const bytes = applicationServerKeyFrom(VAPID_PUBLIC_KEY);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.byteLength).toBe(65);
    // 0x04 es el prefijo de un punto sin comprimir: si la conversión hubiera
    // tratado la cadena como base64 estándar, el primer byte no sería este.
    expect(bytes[0]).toBe(0x04);
  });

  it('restores the padding base64url omits', () => {
    // "AQID" (sin relleno) y "AQ==" ejercitan longitudes 0 y 2 de relleno.
    expect(Array.from(applicationServerKeyFrom('AQID'))).toEqual([1, 2, 3]);
    expect(Array.from(applicationServerKeyFrom('AQ'))).toEqual([1]);
  });

  it('translates the URL-safe alphabet back to standard base64', () => {
    // 0xFB 0xFF decodifica a "-_8" en base64url y a "+/8" en base64 estándar.
    expect(Array.from(applicationServerKeyFrom('-_8'))).toEqual([251, 255]);
  });
});

describe('normalizeSubscription', () => {
  it('keeps the endpoint and both encryption keys', () => {
    expect(
      normalizeSubscription(
        fakeSubscription({
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
          keys: { p256dh: 'public', auth: 'secret' },
        }),
      ),
    ).toEqual({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      keys: { p256dh: 'public', auth: 'secret' },
    });
  });

  it('rejects a subscription missing either key instead of sending a half body', () => {
    expect(
      normalizeSubscription(
        fakeSubscription({
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
          keys: { p256dh: 'public' },
        }),
      ),
    ).toBeNull();
    expect(
      normalizeSubscription(fakeSubscription({ keys: { p256dh: 'public', auth: 'secret' } })),
    ).toBeNull();
  });
});
