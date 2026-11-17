import { expect, test, type Page } from '@playwright/test';
import { dismissTour, mockPassword, openPage, signIn } from './fixtures';


async function login(page: Page, email: string) {
  await signIn(page, { email, password: mockPassword });
  await dismissTour(page);
}

test('new clients are required to continue onboarding', async ({ page }) => {
  await login(page, 'new.mock@gymsheet.local');
  await expect(page).toHaveURL(/\/onboarding$/u, { timeout: 40_000 });
  await expect(page.getByRole('heading', { name: '¿Qué quieres conseguir?' })).toBeVisible();
  await expect(page.getByText('Paso 1 de 4')).toBeVisible();
});

// «Membresía» (/membership) and its WhatsApp renewal left with franja 8e (ADR-0026):
// «Mis suscripciones» is covered by `suscripciones.spec.ts`.
