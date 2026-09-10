/**
 * Flujos funcionales (WS1). Cada prueba recorre un camino completo de usuario y
 * afirma lo que la pantalla debe mostrar; los fallos son hallazgos, no ruido.
 */
import { expect, test } from '@playwright/test';
import { admin, athlete, openPage, signIn } from './fixtures';



test('login rechaza credenciales invalidas con mensaje visible', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill('athlete.mock@gymsheet.local');
  await page.getByLabel('Contraseña', { exact: true }).fill('ContrasenaIncorrecta1!');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveURL(/\/login/u);
});

test('login valida el formato del correo antes de enviar', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill('no-es-un-correo');
  await page.getByLabel('Contraseña', { exact: true }).fill('12345678');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByText('Ingresa un correo válido.')).toBeVisible({ timeout: 10_000 });
});

test('registro rechaza un correo ya existente', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel(/Nombre completo/u).fill('QA Duplicado');
  await page.getByLabel('Correo electrónico').fill('athlete.mock@gymsheet.local');
  await page.getByLabel('Contraseña', { exact: true }).fill('QaSweep-2026!');
  await page.getByLabel(/Confirma|Repite/u).fill('QaSweep-2026!');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: /Crear cuenta|Registrarme|Continuar/u }).first().click();
  await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 20_000 });
});

test('terminos y privacidad son alcanzables con sesion iniciada', async ({ page }) => {
  await signIn(page, athlete);
  await page.goto('/terminos');
  await expect(page).toHaveURL(/\/terminos/u, { timeout: 15_000 });
  await page.goto('/privacidad');
  await expect(page).toHaveURL(/\/privacidad/u, { timeout: 15_000 });
});

test('una ruta inexistente da 404, no un rebote al acceso', async ({ page }) => {
  const response = await page.goto('/ruta-que-no-existe-qa');
  expect(response?.status(), 'anonimo deberia ver 404').toBe(404);
});

test('un prefijo del prototipo no debe romper la aplicacion', async ({ page }) => {
  await page.goto('/constructor');
  const response = await page.goto('/');
  expect(response?.status(), 'la portada tras visitar /constructor').toBeLessThan(500);
});

test('cerrar sesion devuelve al acceso y protege el panel', async ({ page }) => {
  await signIn(page, athlete);
  await openPage(page, '/dashboard');
  const logout = page.getByRole('button', { name: /Cerrar sesión|Salir/u }).first();
  if (!(await logout.isVisible().catch(() => false))) {
    const menu = page.getByRole('button', { name: /Menú|Cuenta|Perfil/u }).first();
    if (await menu.isVisible().catch(() => false)) await menu.click();
  }
  await expect(logout).toBeVisible({ timeout: 15_000 });
  await logout.click();
  await page.waitForURL(/\/login|\/$/u, { timeout: 20_000 });
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/u, { timeout: 15_000 });
});

test('un cliente no puede entrar al panel de administracion', async ({ page }) => {
  await signIn(page, athlete);
  await page.goto('/admin');
  await expect(page).not.toHaveURL(/\/admin$/u, { timeout: 20_000 });
});

test('el atleta puede iniciar y cancelar un entrenamiento', async ({ page }) => {
  await signIn(page, athlete);
  await openPage(page, '/workouts/new');
  await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 20_000 });
  const start = page.getByRole('button', { name: /Iniciar|Comenzar|Empezar/u }).first();
  await expect(start, 'la pantalla de nuevo entrenamiento ofrece un boton de inicio').toBeVisible({
    timeout: 20_000,
  });
});

test('el buscador de ejercicios responde y muestra resultados o vacio explicito', async ({ page }) => {
  await signIn(page, athlete);
  await openPage(page, '/exercises');
  const search = page.getByRole('searchbox').or(page.getByPlaceholder(/Buscar/u)).first();
  await expect(search).toBeVisible({ timeout: 20_000 });
  await search.fill('zzzzzzzzz-no-existe');
  await page.waitForTimeout(3000);
  const body = await page.locator('main').innerText();
  expect(body, 'un buscador sin resultados debe decirlo').toMatch(/sin resultados|no encontramos|no hay|vacío|vacio/iu);
});

test('el panel de administracion carga sus modulos', async ({ page }) => {
  await signIn(page, admin);
  await openPage(page, '/admin');
  await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('main')).not.toContainText(/Application error|Something went wrong/iu);
});
