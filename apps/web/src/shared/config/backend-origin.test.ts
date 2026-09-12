import { describe, expect, it } from 'vitest';
import { resolveBackendOrigin } from './backend-origin';

const baked = 'http://localhost:3001';

describe('resolveBackendOrigin', () => {
  it('usa la dirección de ejecución cuando existe', () => {
    expect(resolveBackendOrigin({ runtime: 'https://api.gymsheet.app', baked })).toBe(
      'https://api.gymsheet.app',
    );
  });

  it('cae en la horneada cuando no hay ninguna configurada', () => {
    expect(resolveBackendOrigin({ runtime: undefined, baked })).toBe(baked);
    expect(resolveBackendOrigin({ runtime: '   ', baked })).toBe(baked);
  });

  it('cae en la horneada cuando la configurada no es una dirección válida', () => {
    expect(resolveBackendOrigin({ runtime: 'no es una url', baked })).toBe(baked);
  });

  // El alias interno de la red de Coolify es el error plausible: `new URL` lo
  // acepta como esquema propio y su `origin` es la cadena «null».
  it('rechaza el alias interno de la red, que no es http ni https', () => {
    expect(resolveBackendOrigin({ runtime: 'gymsheet-backend:3000', baked })).toBe(baked);
  });

  it('se queda solo con el origen, sin ruta ni parámetros', () => {
    expect(resolveBackendOrigin({ runtime: 'https://api.gymsheet.app/api/v1?x=1', baked })).toBe(
      'https://api.gymsheet.app',
    );
  });
});
