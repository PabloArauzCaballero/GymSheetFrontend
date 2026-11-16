import { describe, expect, it, vi } from 'vitest';

const { success } = vi.hoisted(() => ({ success: vi.fn() }));
vi.mock('@/shared/notifications', () => ({ notify: { success } }));

import { notifyReportSent, REPORT_UNDO_MS } from './report-sent-toast';

describe('«Denuncia enviada · Retirar»', () => {
  it('ofrece retirar, con tiempo para alcanzarlo, y dice la consecuencia', () => {
    const onWithdraw = vi.fn();
    notifyReportSent({ contentHidden: false, consequence: 'Deja de aparecerte.', onWithdraw });
    const request = success.mock.calls[0]?.[0];
    expect(request).toMatchObject({ title: 'Denuncia enviada', message: 'Deja de aparecerte.', duration: REPORT_UNDO_MS });
    expect(REPORT_UNDO_MS).toBeGreaterThanOrEqual(10_000);
    expect(request?.action.label).toBe('Retirar');
    request?.action.onClick();
    expect(onWithdraw).toHaveBeenCalledTimes(1);
  });

  it('si el contenido quedó oculto, lo dice', () => {
    notifyReportSent({ contentHidden: true, consequence: 'x', onWithdraw: vi.fn() });
    expect(success.mock.calls.at(-1)?.[0].message).toBe('Retiramos el contenido mientras lo revisamos.');
  });
});
