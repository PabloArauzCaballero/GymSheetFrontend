import { expect, test, type Page } from '@playwright/test';
import { athlete, signIn } from './fixtures';


async function login(page: Page) {
  await signIn(page, athlete);
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
    // Se devuelve 0 mientras la imagen no ha terminado, no `false`: la versión
    // anterior mezclaba booleano y número, así que en cuanto una imagen tardaba
    // el sondeo moría con «received value must be a number» en vez de esperarla
    // —el mensaje no decía nada de la imagen, que es lo que se está probando—.
    // Son imágenes remotas: merecen más margen que el de por defecto.
    await expect
      .poll(
        () =>
          planImages
            .nth(index)
            .evaluate((image: HTMLImageElement) =>
              image.complete ? image.naturalWidth : 0,
            ),
        { timeout: 20_000 },
      )
      .toBeGreaterThan(0);
  }
  expect(failedImages).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('membership.png'), fullPage: true });
});
