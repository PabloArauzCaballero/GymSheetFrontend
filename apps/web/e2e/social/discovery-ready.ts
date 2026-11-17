import type { Page } from '@playwright/test';

/**
 * These specs mock the deck of a member who is ready for Conocer. Since franja 7a the page asks
 * `/me/discovery/readiness` first and does not request the deck without saved preferences (the
 * API would answer 400), so the same premise has to hold for readiness.
 */
export async function stubDiscoveryReady(page: Page): Promise<void> {
  await page.route('**/api/backend/me/discovery/readiness', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: { ready: true, missing: [] } }),
    });
  });
}
