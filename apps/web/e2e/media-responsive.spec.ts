import { expect, test, type Page } from '@playwright/test';

const athlete = {
  email: process.env.E2E_ATHLETE_EMAIL ?? 'active.mock@gymsheet.local',
  password: process.env.E2E_ATHLETE_PASSWORD ?? 'GymSheet-Demo_2026!',
};

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(athlete.email);
  await page.getByLabel('Contraseña').fill(athlete.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/dashboard$/u, { timeout: 15_000 });
}

test('commercial images load and primary pages do not overflow the viewport', async ({
  page,
}, testInfo) => {
  const failedImages: string[] = [];
  page.on('response', (response) => {
    if (response.request().resourceType() === 'image' && !response.ok()) {
      failedImages.push(`${response.status()} ${response.url()}`);
    }
  });

  await login(page);
  for (const path of ['/dashboard', '/exercises', '/profile', '/membership']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      )
      .toBe(true);
    if (path === '/exercises') {
      const exerciseImage = page.locator('img[src*="free-exercise-db"]').first();
      await expect(exerciseImage).toBeVisible({ timeout: 15_000 });
      await expect
        .poll(() =>
          exerciseImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth),
        )
        .toBeGreaterThan(0);
      await page.screenshot({ path: testInfo.outputPath('exercises.png'), fullPage: true });
    }
  }

  const planImages = page.locator('img[src*="images.unsplash.com"]');
  await expect(planImages.first()).toBeVisible();
  const imageCount = await planImages.count();
  for (let index = 0; index < imageCount; index += 1) {
    await expect
      .poll(() =>
        planImages
          .nth(index)
          .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth),
      )
      .toBeGreaterThan(0);
  }
  expect(failedImages).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('membership.png'), fullPage: true });
});
