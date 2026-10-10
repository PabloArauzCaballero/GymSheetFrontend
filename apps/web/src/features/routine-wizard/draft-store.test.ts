import { beforeEach, describe, expect, it, vi } from 'vitest';

// Cada prueba importa el módulo desde cero (con React dentro): la primera carga es lenta.
vi.setConfig({ testTimeout: 30_000 });

const KEY = 'gymsheet.routine-draft.v1';

/** Un módulo nuevo por prueba: el almacén guarda su estado a nivel de módulo. */
async function freshStore() {
  vi.resetModules();
  return import('./draft-store');
}

describe('almacén del borrador del asistente', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('persiste cada cambio y lo recupera al recargar como borrador retomable', async () => {
    const first = await freshStore();
    first.dispatchRoutineDraft({ type: 'campo', campo: 'nombre', valor: 'Mi rutina' });
    expect(window.sessionStorage.getItem(KEY)).toContain('Mi rutina');

    const reloaded = await freshStore();
    const state = reloaded.getRoutineDraft();
    expect(state.draft.nombre).toBe('Mi rutina');
    expect(state.retomado).toBe(true);

    reloaded.dispatchRoutineDraft({ type: 'campo', campo: 'nombre', valor: 'Otra' });
    expect(reloaded.getRoutineDraft().retomado).toBe(false);
  });

  it('un borrador vacío no deja nada guardado y reiniciar lo borra', async () => {
    const store = await freshStore();
    store.dispatchRoutineDraft({ type: 'campo', campo: 'nombre', valor: 'x' });
    expect(window.sessionStorage.getItem(KEY)).not.toBeNull();
    store.dispatchRoutineDraft({ type: 'reiniciar' });
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it('ignora contenido corrupto en el almacenamiento y arranca limpio', async () => {
    window.sessionStorage.setItem(KEY, '{"v":1,"paso":0,"draft":{"nombre":7}}');
    const store = await freshStore();
    expect(store.getRoutineDraft().draft.nombre).toBe('');
    expect(store.getRoutineDraft().retomado).toBe(false);
  });

  it('sigue funcionando en memoria si el almacenamiento lanza', async () => {
    const store = await freshStore();
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError');
    });
    expect(() =>
      store.dispatchRoutineDraft({ type: 'campo', campo: 'nombre', valor: 'Sin disco' }),
    ).not.toThrow();
    expect(store.getRoutineDraft().draft.nombre).toBe('Sin disco');
    setItem.mockRestore();
  });
});
