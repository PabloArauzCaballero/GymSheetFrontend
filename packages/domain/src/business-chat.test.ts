import { describe, expect, it } from 'vitest';
import { businessChatFailure, conversationControls, conversationKindOf, startBusinessChatGate } from './business-chat';

describe('conversationKindOf', () => {
  it('reads the kind, or infers it from systemKind on a server before franja 8f', () => {
    expect(conversationKindOf({ kind: 'BUSINESS', systemKind: null })).toBe('BUSINESS');
    expect(conversationKindOf({ systemKind: 'CORPORATE' })).toBe('SYSTEM');
    expect(conversationKindOf({ systemKind: null })).toBe('DIRECT');
  });
});

describe('conversationControls', () => {
  it('a person in a business chat: no disappearing, location, training or profile; reports as usual', () => {
    const controls = conversationControls({ kind: 'BUSINESS', systemKind: null }, 'person');
    expect(controls).toMatchObject({ realtime: true, disappearing: false, location: false, trainTogether: false, openProfile: false, presence: false, report: true, block: false, businessBadge: true });
  });

  it('a business answering: polling, no report or forward, it can block', () => {
    const controls = conversationControls({ kind: 'BUSINESS', systemKind: null }, 'business');
    expect(controls).toMatchObject({ realtime: false, report: false, forward: false, block: true, receiptSettings: false, location: false, disappearing: false, presence: false });
  });

  it('a chat whose business closed reads «Negocio cerrado» and says why it is read-only (ADR-0028)', () => {
    const closed = conversationControls({ kind: 'BUSINESS', systemKind: null, businessClosed: true }, 'person');
    expect(closed).toMatchObject({ businessBadge: true, businessClosed: true, badge: 'Negocio cerrado' });
    expect(closed.readOnlyNotice).toMatch(/cerró su cuenta/u);
    const open = conversationControls({ kind: 'BUSINESS', systemKind: null, businessClosed: false }, 'person');
    expect(open).toMatchObject({ businessClosed: false, badge: 'Negocio', readOnlyNotice: 'Esta conversación es de solo lectura.' });
    // The flag only means something in a BUSINESS chat seen by the person.
    expect(conversationControls({ kind: 'DIRECT', systemKind: null, businessClosed: true }, 'person').businessClosed).toBe(false);
    expect(conversationControls({ kind: 'BUSINESS', systemKind: null, businessClosed: true }, 'business')).toMatchObject({ businessClosed: false, badge: null });
  });

  it('a business in REPP support chat cannot block it', () => {
    expect(conversationControls({ kind: 'SYSTEM', systemKind: 'CORPORATE' }, 'business').block).toBe(false);
  });

  it('two persons keep every control', () => {
    expect(conversationControls({ kind: 'DIRECT', systemKind: null }, 'person')).toEqual({
      realtime: true,
      disappearing: true,
      location: true,
      trainTogether: true,
      receiptSettings: true,
      report: true,
      forward: true,
      block: false,
      openProfile: true,
      presence: true,
      businessBadge: false,
      businessClosed: false,
      badge: null,
      readOnlyNotice: 'Esta conversación es de solo lectura.',
    });
  });
});

describe('startBusinessChatGate', () => {
  it('hides «Escribir» from a business, asks an anonymous visitor to sign in', () => {
    expect(startBusinessChatGate('business')).toBe('hidden');
    expect(startBusinessChatGate('anonymous')).toBe('sign-in');
    expect(startBusinessChatGate('person')).toBe('enabled');
  });
});

describe('businessChatFailure', () => {
  it('says why each refusal happened', () => {
    expect(businessChatFailure({ status: 403, code: 'BUSINESS_CHAT_BLOCKED' }).title).toBe('Este negocio no recibe tus mensajes');
    expect(businessChatFailure({ status: 429, code: 'BUSINESS_CHAT_LIMIT' }).message).toContain('10 negocios nuevos cada 24 horas');
    expect(businessChatFailure({ status: 403, code: 'EMAIL_VERIFICATION_REQUIRED' }).next).toBe('verify-email');
    expect(businessChatFailure({ status: 409, code: 'BUSINESS_ACCOUNT_LOCKED' }).title).toBe('Tu negocio no puede enviar mensajes');
    expect(businessChatFailure({ status: 404, message: 'No encontramos ese negocio.' }).title).toBe('Este negocio no está disponible');
  });

  it('falls back to the server text for anything else', () => {
    expect(businessChatFailure({ status: 500, message: 'Caído.' })).toEqual({ code: null, title: 'No pudimos abrir el chat', message: 'Caído.' });
    expect(businessChatFailure(null).message).toBe('Vuelve a intentarlo.');
  });
});
