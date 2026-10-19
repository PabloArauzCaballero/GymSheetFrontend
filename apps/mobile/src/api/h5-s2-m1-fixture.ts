type FixturePhase = 'disabled' | 'idle' | 'pending' | 'rollback' | 'second-pending' | 'complete';

export type H5S2M1FixtureSnapshot = {
  enabled: boolean;
  requestCount: number;
  completed: boolean;
  phase: FixturePhase;
};

type FixtureOptions = {
  enabled: boolean;
  baseUrl: string;
  fetchImpl: typeof fetch;
  pendingMs?: number;
};

export const H5_S2_M1_CANDIDATE_ID = '00000000-0000-4000-8000-000000000001';
export const H5_S2_M1_CANDIDATE_NAME = 'Socio QA H5 S2 M1';

export function isH5S2M1FixtureEnabled(isDevelopment: boolean, flag: string | undefined): boolean {
  return isDevelopment === true && flag === '1';
}

const candidate = {
  userId: H5_S2_M1_CANDIDATE_ID,
  displayName: H5_S2_M1_CANDIDATE_NAME,
  objetivo: 'TRAINING',
  branchId: null,
  branchName: null,
  connectionStatus: 'NONE',
  connectionId: null,
  socialStatus: null,
  photoUrl: null,
  photos: [],
  age: 28,
  gender: 'FEMALE',
  experienceLevel: 'BEGINNER',
  points: 0,
  levelCode: null,
};

function jsonResponse(status: number, payload: unknown, contentType = 'application/json'): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': contentType },
  });
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  return (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
}

async function bodyText(input: RequestInfo | URL, init?: RequestInit): Promise<string | null> {
  if (typeof init?.body === 'string') return init.body;
  if (input instanceof Request) return input.clone().text();
  return null;
}

function waitForPending(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(timeout);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', abort, { once: true });
  });
}

/**
 * Local, opt-in H5.S2.M1 transport fixture. Matching swipes are always
 * intercepted before fetchImpl, and an unexpected swipe fails closed.
 */
export function createH5S2M1FixtureFetch({
  enabled,
  baseUrl,
  fetchImpl,
  pendingMs = 1_000,
}: FixtureOptions): {
  fetch: typeof fetch;
  snapshot: () => H5S2M1FixtureSnapshot;
} {
  const active = enabled === true;
  const apiRoot = baseUrl.replace(/\/$/u, '');
  const deckPath = new URL(`${apiRoot}/me/discovery/deck`).pathname;
  const swipePath = new URL(`${apiRoot}/me/discovery/swipes`).pathname;
  let requestCount = 0;
  let phase: FixturePhase = active ? 'idle' : 'disabled';

  const snapshot = (): H5S2M1FixtureSnapshot => ({
    enabled: active,
    requestCount,
    completed: active && requestCount === 2 && phase === 'complete',
    phase,
  });

  const fixtureFetch: typeof fetch = async (input, init) => {
    if (!active) return fetchImpl(input, init);

    let url: URL;
    try {
      url = new URL(input instanceof Request ? input.url : String(input), baseUrl);
    } catch {
      return fetchImpl(input, init);
    }
    const sameOrigin = url.origin === new URL(baseUrl).origin;

    if (sameOrigin && url.pathname === deckPath && requestMethod(input, init) === 'GET') {
      const data = requestCount < 2 ? [candidate] : [];
      return jsonResponse(200, { ok: true, data });
    }

    if (sameOrigin && url.pathname === swipePath) {
      const method = requestMethod(input, init);
      let payload: unknown;
      try {
        const text = await bodyText(input, init);
        payload = text === null ? null : JSON.parse(text);
      } catch {
        payload = null;
      }
      const keys = payload && typeof payload === 'object' && !Array.isArray(payload)
        ? Object.keys(payload).sort()
        : [];
      if (method !== 'POST' || keys.join(',') !== 'direction,targetId'
          || (payload as { targetId?: unknown }).targetId !== H5_S2_M1_CANDIDATE_ID
          || (payload as { direction?: unknown }).direction !== 'LIKE'
          || requestCount >= 2 || phase === 'pending' || phase === 'second-pending') {
        throw new Error('H5.S2.M1 fixture rejected an unexpected discovery swipe');
      }

      requestCount += 1;
      const ordinal = requestCount;
      phase = ordinal === 1 ? 'pending' : 'second-pending';
      await waitForPending(pendingMs, init?.signal ?? (input instanceof Request ? input.signal : undefined));
      if (ordinal === 1) {
        phase = 'rollback';
        return jsonResponse(503, {
          type: 'about:blank', title: 'Service unavailable', status: 503,
        }, 'application/problem+json');
      }
      phase = 'complete';
      return jsonResponse(200, {
        ok: true,
        data: {
          direction: 'LIKE', targetId: H5_S2_M1_CANDIDATE_ID,
          matched: false, connectionId: null,
        },
      });
    }

    return fetchImpl(input, init);
  };

  return { fetch: fixtureFetch, snapshot };
}
