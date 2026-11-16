import assert from 'node:assert/strict';
import { test } from 'node:test';
import { REPORT_UNDO_MS, reportSentRequest } from './report-sent-request.ts';

test('«Denuncia enviada · Retirar»: the action withdraws and the toast waits long enough', () => {
  let withdrawn = 0;
  const request = reportSentRequest({ contentHidden: false, consequence: 'Deja de aparecerte.', onWithdraw: () => { withdrawn += 1; } });
  assert.equal(request.title, 'Denuncia enviada');
  assert.equal(request.message, 'Deja de aparecerte.');
  assert.equal(request.action.label, 'Retirar');
  assert.ok(REPORT_UNDO_MS >= 10_000);
  request.action.onClick();
  assert.equal(withdrawn, 1);
});

test('when the content was hidden by the threshold, it says so', () => {
  const request = reportSentRequest({ contentHidden: true, consequence: 'x', onWithdraw: () => undefined });
  assert.equal(request.message, 'Retiramos el contenido mientras lo revisamos.');
});
