import { describe, expect, it } from 'vitest';
import { chatSystemEventMessage, disappearingDurationLabel } from './chat-system-message';

describe('disappearingDurationLabel', () => {
  it('names the three WhatsApp durations', () => {
    expect(disappearingDurationLabel(86_400)).toBe('24 horas');
    expect(disappearingDurationLabel(604_800)).toBe('7 días');
    expect(disappearingDurationLabel(7_776_000)).toBe('90 días');
  });
});

describe('chatSystemEventMessage', () => {
  const me = '00000000-0000-4000-8000-000000000001';
  const other = '00000000-0000-4000-8000-000000000002';

  it('speaks in second person when the viewer changed the timer', () => {
    expect(chatSystemEventMessage({ kind: 'DISAPPEARING_MESSAGES_CHANGED', seconds: 604_800, changedByUserId: me }, me, 'Ana'))
      .toBe('Activaste los mensajes temporales. Los mensajes nuevos desaparecerán después de 7 días.');
    expect(chatSystemEventMessage({ kind: 'DISAPPEARING_MESSAGES_CHANGED', seconds: null, changedByUserId: me }, me))
      .toBe('Desactivaste los mensajes temporales.');
  });

  it('names the other person when they changed it, or falls back to «Tu contacto»', () => {
    expect(chatSystemEventMessage({ kind: 'DISAPPEARING_MESSAGES_CHANGED', seconds: 86_400, changedByUserId: other }, me, 'Ana'))
      .toContain('Ana activó los mensajes temporales');
    expect(chatSystemEventMessage({ kind: 'DISAPPEARING_MESSAGES_CHANGED', seconds: null, changedByUserId: other }, me))
      .toBe('Tu contacto desactivó los mensajes temporales.');
  });

  it('stays impersonal when the viewer is unknown', () => {
    expect(chatSystemEventMessage({ kind: 'DISAPPEARING_MESSAGES_CHANGED', seconds: 86_400, changedByUserId: me }))
      .toBe('Se activaron los mensajes temporales. Los mensajes nuevos desaparecerán después de 24 horas.');
  });

  it('keeps the training-invite wording', () => {
    expect(chatSystemEventMessage({
      kind: 'TRAINING_INVITE_ACCEPTED', startsAt: '2026-10-20T23:00:00.000Z', timeZone: 'America/La_Paz', placeLabel: 'Gimnasio Central',
    })).toContain('Entrenamiento acordado');
  });
});
