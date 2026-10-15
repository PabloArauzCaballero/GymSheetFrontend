import { expect, test } from '@playwright/test';
import { athlete, openPage, signIn } from '../fixtures';

const DECK_ROUTE = '**/api/backend/me/discovery/deck*';

function incompatibleCandidate() {
  return {
    userId: 'not-a-uuid',
    displayName: 'Persona corrupta',
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
}

function validCandidate() {
  return {
    userId: '00000000-0000-4000-8000-000000000001',
    displayName: 'Ana de prueba',
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
}

test('H5.S1.M1 rejects an incompatible candidate and lets the user retry', async ({ page }) => {
  let deckRequests = 0;
  await page.route(DECK_ROUTE, async (route) => {
    deckRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: [incompatibleCandidate()] }),
    });
  });

  await signIn(page, athlete);
  await openPage(page, '/descubrir');

  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'La respuesta no coincide con el contrato esperado.',
  );
  await expect(page.getByText('Persona corrupta')).toHaveCount(0);
  const requestsBeforeRetry = deckRequests;
  const main = page.getByRole('main');
  await main.getByRole('button', { name: 'Reintentar' }).click();
  await expect.poll(() => deckRequests).toBeGreaterThan(requestsBeforeRetry);
  await expect(main.getByRole('button', { name: 'Reintentar' })).toBeVisible();
});

test('H5.S1.M2 renders the empty deck state and points to Community', async ({ page }) => {
  let deckRequests = 0;
  await page.route(DECK_ROUTE, async (route) => {
    deckRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: [] }),
    });
  });

  await signIn(page, athlete);
  await openPage(page, '/descubrir');

  await expect(page.getByRole('heading', { name: 'No quedan cartas' })).toBeVisible();
  await expect(
    page.getByText(
      'No hay personas que coincidan con estos filtros por ahora. Cámbialos en Comunidad o vuelve más tarde.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'Comunidad' })).toHaveAttribute(
    'href',
    '/comunidad',
  );
  await expect(page.getByRole('button', { name: /Me interesa/u })).toHaveCount(0);
  await expect.poll(() => deckRequests).toBeGreaterThan(0);
});

test('H5.S1.M4 requests a fresh cursor-free deck after returning from a successful swipe', async ({ page }) => {
  const candidate = validCandidate();
  const deckUrls: URL[] = [];
  let deckRequests = 0;
  await page.route(DECK_ROUTE, async (route) => {
    deckUrls.push(new URL(route.request().url()));
    deckRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: deckRequests === 1 ? [candidate] : [] }),
    });
  });
  await page.route('**/api/backend/me/discovery/swipes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: { direction: 'LIKE', targetId: candidate.userId, matched: false, connectionId: null },
      }),
    });
  });

  await signIn(page, athlete);
  await openPage(page, '/descubrir');
  await expect(page.getByRole('button', { name: 'Me interesa Ana de prueba' })).toBeVisible();
  const swipeResponse = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().includes('/me/discovery/swipes'),
  );
  await page.getByRole('button', { name: 'Me interesa Ana de prueba' }).click();
  await expect((await swipeResponse).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'No quedan cartas' })).toBeVisible();
  await expect.poll(() => deckRequests).toBeGreaterThan(1);
  const requestsBeforeReturn = deckRequests;

  await openPage(page, '/comunidad');
  await openPage(page, '/descubrir');
  await expect(page.getByRole('heading', { name: 'No quedan cartas' })).toBeVisible();
  await expect(page.getByText('Ana de prueba')).toHaveCount(0);
  await expect.poll(() => deckRequests).toBeGreaterThan(requestsBeforeReturn);
  expect(deckUrls.at(-1)?.searchParams.has('cursor')).toBe(false);
});

test('H5.S2.M1 tab, Space, and dragging send the same decision', async ({ page }) => {
  const candidate = validCandidate();
  const swipePayloads: unknown[] = [];
  let deckRequests = 0;
  await page.route(DECK_ROUTE, async (route) => {
    deckRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: deckRequests === 1 ? [candidate] : [] }),
    });
  });
  await page.route('**/api/backend/me/discovery/swipes', async (route) => {
    const payload = route.request().postDataJSON() as { targetId: string; direction: string };
    swipePayloads.push(payload);
    if (swipePayloads.length === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/problem+json',
        body: JSON.stringify({ type: 'about:blank', title: 'Service unavailable', status: 503 }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: { direction: payload.direction, targetId: payload.targetId, matched: false, connectionId: null },
      }),
    });
  });

  await signIn(page, athlete);
  await openPage(page, '/descubrir');
  const likeButton = page.getByRole('button', { name: 'Me interesa Ana de prueba' });
  let reachedLikeButtonByTab = false;
  for (let tabPress = 0; tabPress < 50; tabPress += 1) {
    await page.keyboard.press('Tab');
    if (await likeButton.evaluate((element) => element === document.activeElement)) {
      reachedLikeButtonByTab = true;
      break;
    }
  }
  expect(reachedLikeButtonByTab).toBe(true);
  await expect(likeButton).toBeFocused();
  await expect(likeButton).toHaveCSS('outline-width', '2px');
  const keyboardSwipe = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().includes('/me/discovery/swipes'),
  );
  await page.keyboard.press('Space');
  await expect((await keyboardSwipe).status()).toBe(503);
  await expect(likeButton).toBeVisible();

  const candidateName = page.getByText(new RegExp(candidate.displayName, 'u')).first();
  const box = await candidateName.boundingBox();
  expect(box).not.toBeNull();
  const startX = box!.x + box!.width / 2;
  const startY = box!.y + box!.height / 2;
  const gestureSwipe = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().includes('/me/discovery/swipes'),
  );
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 180, startY, { steps: 8 });
  await page.mouse.up();
  await expect((await gestureSwipe).status()).toBe(200);

  expect(swipePayloads).toEqual([
    { targetId: candidate.userId, direction: 'LIKE' },
    { targetId: candidate.userId, direction: 'LIKE' },
  ]);
});
