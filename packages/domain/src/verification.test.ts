import {
  decideVerificationInputSchema,
  myVerificationSchema,
  verificationChallengeSchema,
  verificationQueueSchema,
  verificationSubmissionSchema,
} from '@gymsheet/schemas';
import { describe, expect, it } from 'vitest';
import {
  approveInput,
  formatCountdown,
  gestureGlyph,
  offersVerificationCta,
  rejectInput,
  secondsLeft,
  verificationCopy,
  verificationErrorKind,
  verificationErrorMessage,
  verificationView,
} from './verification';

const id = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';
const userId = '0190e2cb-a6d4-7ec3-8f91-a6c735631502';
const photoId = '0190e2cb-a6d4-7ec3-8f91-a6c735631503';
// Exactly what `mapChallenge` emits (`toISOString()`).
const challenge = {
  id,
  gesture: { code: 'THUMB_UP', instruction: 'Haz un pulgar arriba junto a tu cara' },
  expiresAt: '2026-11-16T10:10:00.000Z',
};

describe('verification contracts (backend-shaped samples)', () => {
  it('parses GET /me/verification in every status, including NONE and REVOKED', () => {
    for (const status of ['NONE', 'PENDING_UPLOAD', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED']) {
      const parsed = myVerificationSchema.parse({
        status,
        verifiedAt: status === 'APPROVED' ? '2026-11-16T10:00:00.000Z' : null,
        challenge: status === 'PENDING_UPLOAD' ? challenge : null,
        lastDecision:
          status === 'REJECTED'
            ? {
                decision: 'REJECTED',
                reason: 'GESTURE_MISMATCH',
                reasonText: 'El gesto de la selfie no coincide con el que te pedimos.',
                decidedAt: '2026-11-16T10:00:00.000Z',
              }
            : null,
        canRetryAt: null,
      });
      expect(parsed.status).toBe(status);
    }
  });

  it('keeps an unknown gesture code instead of failing the whole status', () => {
    const parsed = verificationChallengeSchema.parse({ ...challenge, gesture: { code: 'NEW_ONE', instruction: 'Sonríe' } });
    expect(gestureGlyph(parsed.gesture)).toBe('🙂');
    expect(gestureGlyph(challenge.gesture)).toBe('👍');
  });

  it('parses the selfie submission and rejects an unknown attempt status', () => {
    expect(verificationSubmissionSchema.parse({ id, status: 'PENDING_REVIEW', submittedAt: '2026-11-16T10:05:00.000Z' }).status).toBe(
      'PENDING_REVIEW',
    );
    expect(verificationSubmissionSchema.safeParse({ id, status: 'NONE', submittedAt: null }).success).toBe(false);
  });

  it('parses the staff queue as a plain array with the signed selfie link', () => {
    const [item] = verificationQueueSchema.parse([
      {
        id,
        status: 'PENDING_REVIEW',
        member: { id: userId, name: 'Ana' },
        gesture: challenge.gesture,
        submittedAt: '2026-11-16T10:05:00.000Z',
        selfie: { url: `/api/v1/admin/verifications/${id}/selfie?expires=1&signature=abcdefghijklmnopqrstuv`, expiresAt: '2026-11-16T10:10:00.000Z' },
        profilePhotos: [{ id: photoId, url: 'https://cdn.example.test/a.jpg' }],
      },
    ]);
    expect(item?.profilePhotos).toHaveLength(1);
  });

  it('builds decisions the backend accepts: approval bound to the compared photos, rejection with a reason', () => {
    const approve = approveInput({ profilePhotos: [{ id: photoId, url: 'x' }] });
    expect(approve).toEqual({ decision: 'APPROVE', comparedPhotoIds: [photoId] });
    expect(decideVerificationInputSchema.parse(approve)).toEqual(approve);
    expect(decideVerificationInputSchema.parse(rejectInput('LOW_QUALITY'))).toEqual({ decision: 'REJECT', reason: 'LOW_QUALITY' });
    expect(decideVerificationInputSchema.safeParse({ decision: 'APPROVE', comparedPhotoIds: [] }).success).toBe(false);
  });
});

describe('verification rules', () => {
  it('offers the CTA unless verified or in review', () => {
    expect(offersVerificationCta('NONE')).toBe(true);
    expect(offersVerificationCta('REJECTED')).toBe(true);
    expect(offersVerificationCta('EXPIRED')).toBe(true);
    expect(offersVerificationCta('REVOKED')).toBe(true);
    expect(offersVerificationCta('PENDING_UPLOAD')).toBe(true);
    expect(offersVerificationCta('APPROVED')).toBe(false);
    expect(offersVerificationCta('PENDING_REVIEW')).toBe(false);
    expect(offersVerificationCta(undefined)).toBe(false);
  });

  it('counts down to the deadline and never below zero', () => {
    const now = Date.parse('2026-11-16T10:00:00.000Z');
    expect(secondsLeft(challenge.expiresAt, now)).toBe(600);
    expect(secondsLeft(challenge.expiresAt, now + 599_500)).toBe(1);
    expect(secondsLeft(challenge.expiresAt, now + 700_000)).toBe(0);
    expect(formatCountdown(600)).toBe('10:00');
    expect(formatCountdown(65)).toBe('1:05');
    expect(formatCountdown(-3)).toBe('0:00');
  });

  it('describes each status, with the rejection reason the server wrote', () => {
    const rejected = verificationView({
      status: 'REJECTED',
      canRetryAt: null,
      lastDecision: { decision: 'REJECTED', reason: 'LOW_QUALITY', reasonText: 'La selfie está borrosa o muy oscura.', decidedAt: 'x' },
    });
    expect(rejected).toMatchObject({ title: verificationCopy.rejectedTitle, body: 'La selfie está borrosa o muy oscura.', canStart: true });
    expect(verificationView({ status: 'PENDING_REVIEW', canRetryAt: null, lastDecision: null }).canStart).toBe(false);
    expect(verificationView({ status: 'EXPIRED', canRetryAt: '2026-11-17T10:00:00.000Z', lastDecision: null })).toMatchObject({
      body: verificationCopy.rateLimited,
      canStart: false,
    });
  });

  it('maps the backend error codes to calm states', () => {
    expect(verificationErrorKind({ code: 'CONSENT_REQUIRED', status: 400 })).toBe('consent');
    expect(verificationErrorKind({ code: 'VERIFICATION_UNAVAILABLE', status: 503 })).toBe('unavailable');
    expect(verificationErrorKind({ status: 503 })).toBe('unavailable');
    expect(verificationErrorKind({ code: 'VERIFICATION_CHALLENGE_EXPIRED', status: 409 })).toBe('expired');
    expect(verificationErrorKind({ code: 'VERIFICATION_PHOTOS_CHANGED', status: 409 })).toBe('photosChanged');
    expect(verificationErrorKind({ code: 'VERIFICATION_RATE_LIMITED', status: 429 })).toBe('rateLimited');
    expect(verificationErrorKind(new Error('boom'))).toBe('other');
    expect(verificationErrorMessage('unavailable')).toBe(verificationCopy.unavailableBody);
    expect(verificationErrorMessage('other')).toBeNull();
  });
});
