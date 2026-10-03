import { describe, expect, it } from 'vitest';
import nextConfig from '../../../next.config';

describe('cabeceras de permisos de la web', () => {
  it('permite la ubicación al propio sitio para verificar la racha', async () => {
    const rules = await nextConfig.headers?.();
    const policy = rules?.[0]?.headers.find((header) => header.key === 'Permissions-Policy')?.value;
    expect(policy).toContain('geolocation=(self)');
    expect(policy).toContain('microphone=()');
  });
});
