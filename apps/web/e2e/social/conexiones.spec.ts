import { expect, test, type Route } from '@playwright/test';
import { athlete, openPage, signIn } from '../fixtures';

const ANA_ID = '00000000-0000-4000-8000-000000000011';
const BLOCKED_ID = '00000000-0000-4000-8000-000000000012';
const CONNECTION_ID = '00000000-0000-4000-8000-000000000021';
const CONVERSATION_ID = '00000000-0000-4000-8000-000000000031';

function entry(
  connectionStatus: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACCEPTED' = 'NONE',
) {
  return {
    userId: ANA_ID,
    displayName: 'Ana de prueba',
    objetivo: 'TRAINING',
    branchId: null,
    branchName: null,
    connectionStatus,
    connectionId: connectionStatus === 'NONE' ? null : CONNECTION_ID,
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

function connection(direction: 'SENT' | 'RECEIVED', status: 'PENDING' | 'ACCEPTED' = 'PENDING') {
  return {
    id: CONNECTION_ID,
    otherUserId: ANA_ID,
    otherUserName: 'Ana de prueba',
    direction,
    status,
    createdAt: '2026-10-09T12:00:00.000Z',
  };
}

function conversation() {
  return {
    conversationId: CONVERSATION_ID,
    otherUserId: ANA_ID,
    otherUserName: 'Ana de prueba',
    otherUserPhotoUrl: null,
    otherUserOnline: false,
    otherUserLastSeenAt: null,
    lastMessage: null,
    lastMessageAt: null,
    canWrite: true,
    systemKind: null,
    nickname: null,
    otherUserLastDeliveredAt: null,
    otherUserLastReadAt: null,
    otherUserReadReceiptsSinceAt: null,
  };
}

async function fulfill(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, data }),
  });
}

test('H3.S2.M1 aceptar una solicitud muestra la conexión y su entrada de chat', async ({
  page,
}) => {
  let accepted = false;
  await page.route('**/api/backend/me/connections**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'PATCH') {
      accepted = request.postDataJSON().action === 'ACCEPT';
      await fulfill(route, connection('RECEIVED', 'ACCEPTED'));
    } else {
      await fulfill(
        route,
        url.searchParams.get('status') === 'ACCEPTED'
          ? accepted
            ? [connection('RECEIVED', 'ACCEPTED')]
            : []
          : accepted
            ? []
            : [connection('RECEIVED')],
      );
    }
  });
  await page.route('**/api/backend/me/conversations', async (route) => {
    await fulfill(route, accepted ? [conversation()] : []);
  });

  await signIn(page, athlete);
  await openPage(page, '/chat');
  await page.getByRole('tab', { name: 'Solicitudes' }).click();
  await expect(page.getByText('Ana de prueba')).toBeVisible();
  await page.getByRole('button', { name: 'Aceptar' }).click();
  await expect.poll(() => accepted).toBe(true);

  await page.getByRole('tab', { name: 'Mis conexiones' }).click();
  await expect(page.getByText('Ana de prueba')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mensaje' })).toBeVisible();
  await page.getByRole('tab', { name: 'General' }).click();
  await expect(
    page.getByRole('link', { name: /Ana de prueba.*Todavía sin mensajes/u }),
  ).toHaveAttribute('href', `/chat/${CONVERSATION_ID}`);
});

test('H3.S2.M2 retirar una solicitud enviada la quita y no crea una conversación', async ({
  page,
}) => {
  let withdrawn = false;
  let conversationCreates = 0;
  await page.route('**/api/backend/me/connections**', async (route) => {
    const request = route.request();
    if (request.method() === 'DELETE') {
      withdrawn = true;
      await fulfill(route, { deleted: true });
    } else {
      await fulfill(route, withdrawn ? [] : [connection('SENT')]);
    }
  });
  await page.route('**/api/backend/me/conversations', async (route) => {
    if (route.request().method() === 'POST') conversationCreates += 1;
    await fulfill(route, []);
  });

  await signIn(page, athlete);
  await openPage(page, '/chat');
  await page.getByRole('tab', { name: 'Solicitudes' }).click();
  await page.getByRole('button', { name: 'Cancelar invitación de conexión' }).click();
  await expect.poll(() => withdrawn).toBe(true);
  await expect(page.getByRole('heading', { name: 'Sin solicitudes' })).toBeVisible();
  await page.getByRole('tab', { name: 'General' }).click();
  await expect(page.getByRole('heading', { name: 'Sin conversaciones' })).toBeVisible();
  expect(conversationCreates).toBe(0);
});

test('H3.S2.M3 deshacer un paso devuelve la carta y conserva los bloqueos', async ({ page }) => {
  let passed = false;
  let undone = false;
  // El backend ya tiene a BLOCKED_ID bloqueado. La baraja respeta ese estado;
  // el endpoint undo sólo revierte la decisión sobre Ana y nunca debe tocar el bloqueo.
  let unblockCalls = 0;
  await page.route('**/api/backend/me/discovery/deck**', async (route) => {
    await fulfill(route, passed && !undone ? [] : [entry()]);
  });
  await page.route('**/api/backend/me/discovery/swipes', async (route) => {
    passed = route.request().postDataJSON().direction === 'PASS';
    undone = false;
    await fulfill(route, {
      direction: 'PASS',
      targetId: ANA_ID,
      matched: false,
      connectionId: null,
    });
  });
  await page.route('**/api/backend/me/discovery/swipes/undo', async (route) => {
    undone = true;
    await fulfill(route, {
      undone: 'PASS',
      targetId: ANA_ID,
      connectionId: null,
      unmatched: false,
    });
  });
  await page.route(`**/api/backend/me/blocks/${BLOCKED_ID}`, async (route) => {
    if (route.request().method() === 'DELETE') unblockCalls += 1;
    await fulfill(route, { unblocked: true });
  });
  await page.route('**/api/backend/me/blocks', async (route) => {
    await fulfill(route, [
      { userId: BLOCKED_ID, displayName: 'Socio bloqueado', blockedAt: '2026-10-09T12:00:00.000Z' },
    ]);
  });

  await signIn(page, athlete);
  await openPage(page, '/descubrir');
  await expect(page.getByRole('button', { name: 'Pasar de Ana de prueba' })).toBeVisible();
  await page.getByRole('button', { name: 'Pasar de Ana de prueba' }).click();
  await expect(page.getByRole('heading', { name: 'No quedan cartas' })).toBeVisible();
  const undoButton = page.getByRole('button', { name: 'Deshacer la última' });
  await expect(undoButton).toBeVisible();
  await expect(undoButton).toBeEnabled();
  const undoResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().includes('/me/discovery/swipes/undo'),
  );
  await undoButton.click();
  await expect((await undoResponse).status()).toBe(200);
  await expect(page.getByRole('button', { name: 'Pasar de Ana de prueba' })).toBeVisible();
  expect(undone).toBe(true);
  await openPage(page, '/comunidad/bloqueados');
  await expect(page.getByText('Socio bloqueado')).toBeVisible();
  expect(unblockCalls).toBe(0);
});

test('H3.S2.M4 el perfil refleja una solicitud pendiente enviada desde otra superficie', async ({
  page,
}) => {
  let sent = false;
  await page.route('**/api/backend/me/gym-directory**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith(ANA_ID)) {
      await fulfill(route, { ...entry(sent ? 'PENDING_SENT' : 'NONE'), badges: [] });
    } else {
      await fulfill(route, [entry(sent ? 'PENDING_SENT' : 'NONE')]);
    }
  });
  await page.route('**/api/backend/me/connections**', async (route) => {
    if (route.request().method() === 'POST') {
      sent = true;
      await fulfill(route, connection('SENT'));
    } else {
      await fulfill(route, []);
    }
  });
  await page.route('**/api/backend/me/stories/feed', async (route) => {
    await fulfill(route, []);
  });
  await page.route('**/api/backend/me/interactions/counts', async (route) => {
    await fulfill(route, {
      likesReceived: 0,
      likesSent: 0,
      passesReceived: 0,
      passesSent: 0,
      profileViewsNew: 0,
    });
  });
  await page.route('**/api/backend/me/profile-views', async (route) => {
    await fulfill(route, { recorded: true });
  });

  await signIn(page, athlete);
  await openPage(page, '/comunidad');
  await page.getByRole('button', { name: `Conectar con Ana de prueba` }).click();
  await expect.poll(() => sent).toBe(true);
  await page.getByRole('button', { name: `Ver el perfil de Ana de prueba` }).click();
  await expect(page).toHaveURL(new RegExp(`/perfil/${ANA_ID}$`, 'u'));
  await expect(page.getByRole('button', { name: 'Cancelar invitación de conexión' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Conectar', exact: true })).toHaveCount(0);
});
