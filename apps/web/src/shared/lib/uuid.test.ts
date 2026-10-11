import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomUuid } from './uuid';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

/* Capturada ANTES de sustituir el global: dentro del stub `globalThis.crypto`
   ya es el propio stub y llamarlo alli se llama a si mismo sin fin. */
const getRandomValuesReal = globalThis.crypto.getRandomValues.bind(globalThis.crypto);

describe('randomUuid', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('usa crypto.randomUUID cuando el contexto es seguro', () => {
    const randomUUID = vi.fn(() => '11111111-2222-4333-8444-555555555555');
    vi.stubGlobal('crypto', { randomUUID, getRandomValues: getRandomValuesReal });
    expect(randomUuid()).toBe('11111111-2222-4333-8444-555555555555');
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  /*
   * El caso que rompio el despliegue servido por HTTP plano: fuera de contexto
   * seguro `randomUUID` NO existe y llamarla lanza `TypeError`, que en
   * `apiRequest` saltaba antes del `fetch` y se leia como «no se pudo conectar».
   */
  it('genera un v4 valido cuando randomUUID no existe', () => {
    vi.stubGlobal('crypto', { getRandomValues: getRandomValuesReal });
    const generados = Array.from({ length: 200 }, () => randomUuid());
    for (const uuid of generados) expect(uuid).toMatch(V4);
    expect(new Set(generados).size).toBe(generados.length);
  });
});
