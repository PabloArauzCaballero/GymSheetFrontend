import { describe, expect, it } from 'vitest';
import { myReportStatusLabel, myReportTitle, reportKindLabel, withdrawConfirmMessage } from './my-reports';

describe('«Tus denuncias»', () => {
  it('titula por nombre lo que tiene nombre, y por tipo y autor lo demás', () => {
    expect(myReportTitle({ targetKind: 'ROUTINE', title: ' Pierna 3 días ', ownerName: 'Ana', status: 'EN_REVISION' })).toBe('Pierna 3 días');
    expect(myReportTitle({ targetKind: 'COMMENT', title: null, ownerName: 'Ana', status: 'EN_REVISION' })).toBe('Comentario de Ana');
    expect(myReportTitle({ targetKind: 'ROUTINE', title: null, ownerName: 'Ana', status: 'EN_REVISION' })).toBe('Rutina de Ana');
    expect(myReportTitle({ targetKind: 'USER', title: null, ownerName: 'Leo', status: 'EN_REVISION' })).toBe('Leo');
    expect(myReportTitle({ targetKind: 'NUEVO', title: null, ownerName: 'Leo', status: 'EN_REVISION' })).toBe('Contenido de Leo');
  });

  it('el tipo, el estado y la confirmación', () => {
    expect(reportKindLabel('USER')).toBe('Perfil');
    expect(reportKindLabel('CHAT_MESSAGE')).toBe('Mensaje');
    expect(reportKindLabel('?')).toBe('Contenido');
    expect(myReportStatusLabel('REVISADA')).toBe('Revisada');
    expect(myReportStatusLabel('EN_REVISION')).toBe('En revisión');
    expect(withdrawConfirmMessage({ status: 'REVISADA', targetKind: 'ROUTINE' })).toContain('se mantiene');
    expect(withdrawConfirmMessage({ status: 'EN_REVISION', targetKind: 'ROUTINE' })).toContain('Dejaremos de revisarla');
  });

  it('solo promete lo que retirar hace: la rutina vuelve; una persona o un mensaje, no reconecta', () => {
    expect(withdrawConfirmMessage({ status: 'EN_REVISION', targetKind: 'ROUTINE' })).toContain('vuelve a aparecerte en Explorar');
    for (const targetKind of ['USER', 'CHAT_MESSAGE', 'COMMENT']) {
      const message = withdrawConfirmMessage({ status: 'EN_REVISION', targetKind });
      expect(message).not.toContain('vuelve a aparecerte');
      expect(message).toContain('no vuelve solo');
    }
  });
});
