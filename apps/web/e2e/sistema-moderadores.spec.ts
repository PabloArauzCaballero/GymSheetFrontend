/**
 * The REPP moderation team (backend ADR-0018), managed from `/sistema/moderadores`.
 *
 * The platform admin finds a member account by email, adds it to the team after
 * confirming, and the account lands on the moderation queue on its next login;
 * then it is removed and the backend refuses it the queue again. Each step is
 * proven through the real API, not by the toast.
 */
import { test } from '@playwright/test';
import { evidencia } from './evidencia';
import { apiDe, crearCuenta, promover } from './rutinas-datos';
import { abrirComo, abrirSegundo, comboLabel, combos, expect } from './rutinas-pagina';

for (const combo of combos) {
  test.describe(`equipo de moderación · ${comboLabel(combo)}`, () => {
    test.use({ viewport: { width: combo.width, height: combo.height } });
    test.setTimeout(240_000);

    test('sumar y quitar a una persona del equipo', async ({ page, context, browser, baseURL }) => {
      const sistema = await promover(await crearCuenta('sistema', 'QA Sistema Moderadores'), 'SYSTEM_ADMIN');
      const socia = await crearCuenta('socia', `Socia Moderadora ${Date.now().toString(36)}`);
      await abrirComo(page, context, baseURL, combo, sistema);

      await page.goto('/sistema/moderadores');
      await expect(page.getByRole('heading', { level: 1, name: 'Equipo de moderación' })).toBeVisible();
      await page.getByRole('searchbox', { name: 'Buscar socio por correo o nombre' }).fill(socia.email);
      await page.getByRole('button', { name: `Sumar a ${socia.nombre}` }).click();
      const dialogo = page.getByRole('dialog');
      await expect(dialogo).toContainText('todos los gimnasios');
      await evidencia(page, 'ADR-0018', '01', 'confirmar-alta-moderadora');
      await dialogo.getByRole('button', { name: 'Sumar al equipo' }).click();
      const equipo = page.getByRole('list', { name: 'Equipo de moderación' });
      await expect(equipo).toContainText(socia.email);

      // Reload: the list comes from the backend, not from local state.
      await page.reload();
      await expect(equipo).toContainText(socia.email);
      const lista = await apiDe(sistema)<Array<{ email: string }>>('GET', '/admin/platform/moderators');
      expect(lista.data.map((moderador) => moderador.email)).toContain(socia.email);
      await evidencia(page, 'ADR-0018', '02', 'equipo-con-moderadora');

      // The new moderator lands on the queue.
      const moderadora = await abrirSegundo(browser, baseURL, combo, socia);
      await moderadora.page.goto('/dashboard');
      await expect(moderadora.page).toHaveURL(/\/moderacion$/u);
      await expect(moderadora.page.getByRole('heading', { level: 1, name: 'Moderación' })).toBeVisible();
      await evidencia(moderadora.page, 'ADR-0018', '03', 'moderadora-en-la-cola');

      await page.getByRole('button', { name: `Quitar a ${socia.nombre}` }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Quitar del equipo' }).click();
      await expect(equipo.getByText(socia.email)).toHaveCount(0);
      const cola = await moderadora.page.request.get('/api/backend/admin/moderation/queue');
      expect(cola.status()).toBe(403);
      await evidencia(page, 'ADR-0018', '04', 'moderadora-quitada');
      await moderadora.context.close();
    });
  });
}
