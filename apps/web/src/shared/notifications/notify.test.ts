import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import type { ToastAdapter } from './adapters/toast-adapter';
import type { NotificationRequest } from './core/types';
import { NotificationEngine } from './notify';

function fakeAdapter() {
  const shown: NotificationRequest[] = [];
  const adapter: ToastAdapter = {
    show(request) {
      shown.push(request);
      return request.id ?? shown.length;
    },
    dismiss: vi.fn(),
  };
  return { adapter, shown };
}

describe('NotificationEngine', () => {
  it('forwards a plain success message', () => {
    const { adapter, shown } = fakeAdapter();
    new NotificationEngine(adapter).success('Guardado.');
    expect(shown[0]!).toMatchObject({ severity: 'success', message: 'Guardado.' });
  });

  it('maps a thrown ApiError to friendly copy instead of leaking .message', () => {
    const { adapter, shown } = fakeAdapter();
    new NotificationEngine(adapter).error(
      new ApiError({ message: 'stack at db.ts:1', status: 500, kind: 'unexpected' }),
    );
    expect(shown[0]!.severity).toBe('error');
    expect(shown[0]!.message).toBe('Ocurrió un error inesperado. Inténtalo más tarde.');
    expect(shown[0]!.title).toBe('Algo salió mal');
  });

  it('accepts an explicit error string verbatim', () => {
    const { adapter, shown } = fakeAdapter();
    new NotificationEngine(adapter).error('No se pudo exportar.');
    expect(shown[0]!.message).toBe('No se pudo exportar.');
  });

  it('suppresses a duplicate error within the dedup window', () => {
    const { adapter, shown } = fakeAdapter();
    const engine = new NotificationEngine(adapter);
    engine.error('Repetido.');
    engine.error('Repetido.');
    expect(shown).toHaveLength(1);
  });

  it('promise() shows loading then success and returns the value', async () => {
    const { adapter, shown } = fakeAdapter();
    const value = await new NotificationEngine(adapter).promise(Promise.resolve(42), {
      loading: 'Guardando…',
      success: 'Guardado.',
    });
    expect(value).toBe(42);
    expect(shown.map((r) => r.severity)).toEqual(['info', 'success']);
    expect(shown[1]!.id).toBeDefined(); // success reuses the loading toast's id
  });

  it('promise() maps a rejection to friendly copy and rethrows', async () => {
    const { adapter, shown } = fakeAdapter();
    const engine = new NotificationEngine(adapter);
    await expect(
      engine.promise(Promise.reject(new ApiError({ message: 'x', status: 403, kind: 'forbidden' })), {
        loading: 'Guardando…',
        success: 'Ok.',
      }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(shown[1]!.severity).toBe('error');
    expect(shown[1]!.message).toBe('No tienes permisos para realizar esta acción.');
  });
});
