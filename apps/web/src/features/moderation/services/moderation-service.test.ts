import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  moderationCaseDetailSchema,
  moderationCaseSchema,
  moderationReasons,
  moderationService,
  moderationTargetKinds,
  REASON_LABEL,
  reasonsFor,
  TARGET_LABEL,
} from './moderation-service';

const uuid = (n: number) => `0190e2cb-a6d4-7ec3-8f91-a6c7356315${String(n).padStart(2, '0')}`;

function queueRow(kind: string, n: number, overrides: Record<string, unknown> = {}) {
  return {
    target_kind: kind,
    target_id: uuid(n),
    reported_user_id: uuid(n + 50),
    reported_user_name: 'Ana',
    // El backend añade columnas que la pantalla no usa; no deben romper nada.
    tenant_id: 'default',
    report_count: 3,
    reporter_count: 3,
    reasons: ['EJERCICIO_PELIGROSO', 'INFORMACION_ENGANOSA', 'PLAGIO'],
    severity: 2,
    first_reported_at: '2026-10-08T16:20:29.177Z',
    last_reported_at: '2026-10-08T16:20:29.191Z',
    claimed_by_user_id: null,
    claimed_by_name: null,
    claimed_at: null,
    content_hidden: false,
    ...overrides,
  };
}

function stubBackend(data: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true, data }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('moderación: tipos y motivos', () => {
  it('conoce los cuatro tipos antiguos y los tres nuevos', () => {
    expect([...moderationTargetKinds].sort()).toEqual(
      ['CHAT_MESSAGE', 'COMMENT', 'EXERCISE', 'PROFILE_PHOTO', 'ROUTINE', 'STORY', 'USER'].sort(),
    );
  });

  it('tiene etiqueta en español para cada tipo y cada motivo', () => {
    expect(TARGET_LABEL.ROUTINE).toBe('Rutina');
    expect(TARGET_LABEL.EXERCISE).toBe('Ejercicio');
    expect(TARGET_LABEL.COMMENT).toBe('Comentario');
    expect(REASON_LABEL.EJERCICIO_PELIGROSO).toBe('Ejercicio peligroso');
    expect(REASON_LABEL.INFORMACION_ENGANOSA).toBe('Información engañosa');
    expect(REASON_LABEL.PLAGIO).toBe('Plagio');
    for (const kind of moderationTargetKinds) expect(TARGET_LABEL[kind]).toBeTruthy();
    for (const reason of moderationReasons) expect(REASON_LABEL[reason]).toBeTruthy();
  });
});

describe('moderación: motivos al denunciar', () => {
  it('los motivos de entrenamiento sólo se ofrecen para rutina, ejercicio y comentario', () => {
    expect(reasonsFor('ROUTINE')).toContain('EJERCICIO_PELIGROSO');
    expect(reasonsFor('COMMENT')).toContain('PLAGIO');
    for (const kind of ['STORY', 'PROFILE_PHOTO', 'CHAT_MESSAGE', 'USER'] as const) {
      expect(reasonsFor(kind)).not.toContain('EJERCICIO_PELIGROSO');
      expect(reasonsFor(kind)).toContain('SPAM');
      expect(reasonsFor(kind)).toHaveLength(9);
    }
  });
});

describe('moderación: la cola', () => {
  it('valida una cola con un caso de cada tipo, nuevos y antiguos', async () => {
    const rows = moderationTargetKinds.map((kind, index) => queueRow(kind, index + 1));
    const fetchMock = stubBackend(rows);

    const queue = await moderationService.queue();

    expect(queue.map((item) => item.target_kind)).toEqual([...moderationTargetKinds]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('lee content_hidden null como contenido visible (consulta con LEFT JOIN)', () => {
    const parsed = moderationCaseSchema.parse(queueRow('COMMENT', 1, { content_hidden: null }));
    expect(parsed.content_hidden).toBe(false);
  });

  it('conserva content_hidden true', () => {
    expect(moderationCaseSchema.parse(queueRow('ROUTINE', 1, { content_hidden: true })).content_hidden).toBe(true);
  });

  it('rechaza un tipo inventado y un motivo inventado', () => {
    expect(moderationCaseSchema.safeParse(queueRow('BOGUS_KIND', 1)).success).toBe(false);
    expect(moderationCaseSchema.safeParse(queueRow('ROUTINE', 1, { reasons: ['INVENTADO'] })).success).toBe(false);
  });
});

describe('moderación: el caso', () => {
  const detail = (targetKind: string, reason: string) => ({
    targetKind,
    targetId: uuid(1),
    reportedUser: { id: uuid(2), name: 'Ana', suspendedUntil: null },
    reports: [
      { id: uuid(3), reporterUserId: uuid(4), reason, details: null, createdAt: '2026-10-08T16:20:29.177Z', status: 'PENDIENTE' },
    ],
    activeStrikes: 0,
    pendingSanction: { kind: 'ADVERTENCIA', days: 0 },
    contentHidden: false,
  });

  it.each([
    ['ROUTINE', 'EJERCICIO_PELIGROSO'],
    ['EXERCISE', 'INFORMACION_ENGANOSA'],
    ['COMMENT', 'PLAGIO'],
    ['STORY', 'SPAM'],
    ['USER', 'PERFIL_FALSO'],
  ])('valida el detalle de %s con el motivo %s', (kind, reason) => {
    expect(moderationCaseDetailSchema.safeParse(detail(kind, reason)).success).toBe(true);
  });

  it('pide ocultar o restaurar con hideContent en resolve', async () => {
    const fetchMock = stubBackend({ resolved: true, reportsClosed: 3, sanction: null, contentHidden: false });

    await moderationService.resolve('ROUTINE', uuid(1), { hideContent: false, sanction: false });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/backend/admin/moderation/cases/ROUTINE/${uuid(1)}/resolve`);
    expect(JSON.parse(String(init.body))).toEqual({ hideContent: false, sanction: false });
  });
});
