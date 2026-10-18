import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage, Message } from '@gymsheet/schemas';

const CONV = '11111111-1111-4111-8111-111111111111';
const ME = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';

const mocks = vi.hoisted(() => ({
  chatService: {
    listMessages: vi.fn(),
    listConversations: vi.fn(),
    getReadReceiptSettings: vi.fn(),
    markRead: vi.fn(),
    editMessage: vi.fn(),
    setDisappearing: vi.fn(),
    sendMediaMessage: vi.fn(),
    sendMessage: vi.fn(),
    setNickname: vi.fn(),
    deleteMessage: vi.fn(),
    viewMessage: vi.fn(),
    updateReadReceiptSettings: vi.fn(),
  },
  push: vi.fn(),
  notify: { info: vi.fn(), error: vi.fn(), success: vi.fn(), warning: vi.fn() },
  socket: { onMessage: null as null | ((message: unknown) => void), onUpdated: null as null | ((message: unknown) => void) },
  voice: {
    recording: false,
    elapsedMs: 0,
    start: vi.fn(),
    stop: vi.fn(),
  },
  composer: { lastProps: null as null | Record<string, unknown> },
}));

vi.mock('react-native', async () => (await import('./rn-dom')).reactNativeMock());
vi.mock('@/theme', async () => (await import('./rn-dom')).themeMock());
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: CONV }),
  useRouter: () => ({ push: mocks.push, back: vi.fn(), canGoBack: () => true, replace: vi.fn() }),
}));
vi.mock('expo-clipboard', () => ({ setStringAsync: vi.fn().mockResolvedValue(undefined) }));
vi.mock('expo-image', async () => ({ Image: (await import('./rn-dom')).Box }));
vi.mock('expo-video', () => ({ VideoView: () => null, useVideoPlayer: () => ({}) }));
vi.mock('expo-image-picker', () => ({}));
vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn(), notificationAsync: vi.fn(),
  ImpactFeedbackStyle: { Medium: 'm', Light: 'l' }, NotificationFeedbackType: { Success: 's', Warning: 'w' },
}));
vi.mock('expo-audio', () => ({ useAudioPlayer: () => ({}), useAudioPlayerStatus: () => ({ isLoaded: false, playing: false, currentTime: 0, duration: 0 }) }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: ({ accessibilityLabel }: { accessibilityLabel?: string }) => (accessibilityLabel ? <span aria-label={accessibilityLabel} /> : null) }));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
vi.mock('react-native-reanimated', async () => {
  const { Box } = await import('./rn-dom');
  const chain: Record<string, unknown> = {};
  for (const key of ['duration', 'easing', 'withInitialValues', 'delay']) chain[key] = () => chain;
  return { default: { View: Box }, FadeIn: chain, FadeInDown: chain };
});
vi.mock('rn-emoji-keyboard', () => ({ default: () => null }));
vi.mock('@/features/chat/media-preview', () => ({ MediaPreview: () => null }));
vi.mock('@/features/training-invitations/create-training-invite-modal', () => ({ CreateTrainingInviteModal: () => null }));
vi.mock('@/components/bottom-sheet', async () => {
  const { ModalBox } = await import('./rn-dom');
  return {
    BottomSheet: ({ visible, title, children, onDismiss }: { visible: boolean; title: string; children: ReactNode; onDismiss?: () => void }) => (
      <>
        <ModalBox visible={visible}><h2>{title}</h2>{children}</ModalBox>
        {!visible && onDismiss ? <button data-testid={`dismissed-${title}`} onClick={onDismiss} type="button" /> : null}
      </>
    ),
  };
});
vi.mock('@/components/motion', async () => ({ PressableScale: (await import('./rn-dom')).Press, DURATION: { quick: 140 }, PREMIUM_EASING: {} }));
vi.mock('@/components/ui', () => ({ Button: ({ label, onPress }: { label: string; onPress: () => void }) => <button onClick={onPress} type="button">{label}</button> }));
vi.mock('@/components/nav', () => ({ BackLink: () => null }));
vi.mock('@/components/ambient', () => ({ AmbientBackground: () => null }));
vi.mock('@/components/layout', async () => ({ ScrollScreen: (await import('./rn-dom')).Box, useResponsive: () => ({ wide: false, width: 390 }) }));
vi.mock('@/components/feedback', () => ({ EmptyState: ({ title }: { title: string }) => <p>{title}</p>, ErrorState: () => <p>Error</p>, Skeleton: () => <p>Cargando…</p> }));
vi.mock('@/notifications/use-reduce-motion', () => ({ useReduceMotion: () => true }));
vi.mock('@/notifications', () => ({ notify: mocks.notify }));
vi.mock('@/state/auth-store', () => ({ useAuthStore: (select: (state: { principal: { id: string } }) => unknown) => select({ principal: { id: ME } }) }));
vi.mock('@/config/env', () => ({ env: { apiUrl: 'https://api.test/api/v1' } }));
vi.mock('@/api/services', () => ({ chatService: mocks.chatService, moderationService: { report: vi.fn() } }));
vi.mock('@/features/chat/use-media-access-token', () => ({ useMediaAccessToken: () => ({ token: 'token', onMediaError: vi.fn() }) }));
vi.mock('@/features/chat/use-voice-note', () => ({ useVoiceNote: () => mocks.voice }));
vi.mock('@/hooks/use-chat-socket', () => ({
  useChatSocket: (onMessage: (message: unknown) => void, _p: unknown, _r: unknown, _d: unknown, onUpdated: (message: unknown) => void) => {
    mocks.socket.onMessage = onMessage;
    mocks.socket.onUpdated = onUpdated;
    return { connectionState: 'connected', joinConversation: vi.fn().mockResolvedValue(true), leaveConversation: vi.fn(), sendMessage: vi.fn().mockResolvedValue({ ok: true }) };
  },
}));
vi.mock('@/features/chat/chat-composer', () => ({
  ChatComposer: (props: Record<string, unknown> & {
    draft: string; onChangeDraft: (value: string) => void; onSend: () => void; editing: { body: string } | null;
    onOpenAttach: () => void; onVoiceStart: () => void; onVoiceStop: (send: boolean) => void;
  }) => {
    mocks.composer.lastProps = props;
    return (
      <div data-testid="composer">
        {props.editing ? <span>Editar mensaje: {props.editing.body}</span> : null}
        <input aria-label="Mensaje" onChange={(event) => props.onChangeDraft(event.target.value)} value={props.draft} />
        <button onClick={props.onSend} type="button">{props.editing ? 'Guardar edición' : 'Enviar'}</button>
        <button onClick={props.onOpenAttach} type="button">Adjuntar</button>
        <button onClick={props.onVoiceStart} type="button">Grabar</button>
        <button onClick={() => props.onVoiceStop(true)} type="button">Soltar</button>
      </div>
    );
  },
}));

import ChatThreadScreen from '../../../../app/(app)/chat/[id]';

function text(id: string, body: string, minutesAgo: number, senderId = ME): ChatMessage {
  return {
    id, conversationId: CONV, senderId, body, type: 'text', storyReference: null, mediaUrl: null, mediaMimeType: null,
    viewOnce: false, viewed: false, locationLat: null, locationLng: null,
    createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(), editedAt: null, deletedAt: null,
  };
}

const summary = (overrides: Record<string, unknown> = {}) => ({
  conversationId: CONV, otherUserId: OTHER, otherUserName: 'Ana Pérez', otherUserPhotoUrl: null, otherUserOnline: false,
  otherUserLastSeenAt: null, lastMessage: null, lastMessageAt: null, canWrite: true, systemKind: null, nickname: null,
  otherUserLastDeliveredAt: null, otherUserLastReadAt: null, otherUserReadReceiptsSinceAt: null, disappearingSeconds: null,
  ...overrides,
});

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><ChatThreadScreen /></QueryClientProvider>);
  return client;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.voice.recording = false;
  mocks.chatService.listConversations.mockResolvedValue([summary()]);
  mocks.chatService.getReadReceiptSettings.mockResolvedValue({ enabled: true, defaultEnabled: true, conversationOverride: null, version: 1 });
  mocks.chatService.markRead.mockResolvedValue({ read: true });
});
afterEach(() => vi.useRealTimers());

describe('editar un mensaje (15 min, solo texto)', () => {
  it('Editar abre el modo edición con el teclado, guarda y muestra el texto nuevo al instante', async () => {
    const original = text('44444444-4444-4444-8444-444444444444', 'Nos vemos a las 7', 2);
    mocks.chatService.listMessages.mockResolvedValue([original]);
    let resolveEdit: (message: Message) => void = () => undefined;
    mocks.chatService.editMessage.mockReturnValue(new Promise((resolve) => { resolveEdit = resolve; }));
    renderScreen();

    fireEvent.contextMenu(await screen.findByText('Nos vemos a las 7'));
    const sheet = await screen.findByRole('dialog');
    fireEvent.click(within(sheet).getByRole('button', { name: 'Editar' }));
    expect(await screen.findByText('Editar mensaje: Nos vemos a las 7')).toBeTruthy();
    expect((screen.getByLabelText('Mensaje') as HTMLInputElement).value).toBe('Nos vemos a las 7');

    // Cuando la hoja termina de irse, el campo se enfoca (teclado arriba, como WhatsApp).
    fireEvent.click(screen.getByTestId('dismissed-Mensaje'));
    await waitFor(() => expect(mocks.composer.lastProps?.focusRequest).toBe(1));

    fireEvent.change(screen.getByLabelText('Mensaje'), { target: { value: 'Nos vemos a las 8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar edición' }));

    expect(mocks.chatService.editMessage).toHaveBeenCalledWith(CONV, original.id, 'Nos vemos a las 8');
    expect(await screen.findByText('Nos vemos a las 8')).toBeTruthy();
    expect(screen.getByText('Editado')).toBeTruthy();
    await act(async () => resolveEdit({ ...original, body: 'Nos vemos a las 8', editedAt: new Date().toISOString() }));
    expect(screen.queryByText('Nos vemos a las 7')).toBeNull();
  });

  it('si el servidor rechaza la edición, vuelve el texto original y avisa', async () => {
    const original = text('55555555-5555-4555-8555-555555555555', 'Hola', 1);
    mocks.chatService.listMessages.mockResolvedValue([original]);
    mocks.chatService.editMessage.mockRejectedValue(new Error('El plazo para editar este mensaje terminó.'));
    renderScreen();

    fireEvent.contextMenu(await screen.findByText('Hola'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText('Mensaje'), { target: { value: 'Hola!!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar edición' }));

    await waitFor(() => expect(mocks.notify.error).toHaveBeenCalledWith('El plazo para editar este mensaje terminó.'));
    expect(screen.getAllByText('Hola').length).toBeGreaterThan(0);
  });

  it('un mensaje de hace más de 15 minutos no ofrece Editar', async () => {
    mocks.chatService.listMessages.mockResolvedValue([text('66666666-6666-4666-8666-666666666666', 'Viejo', 20)]);
    renderScreen();
    fireEvent.contextMenu(await screen.findByText('Viejo'));
    const sheet = await screen.findByRole('dialog');
    expect(within(sheet).queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(within(sheet).getByRole('button', { name: 'Copiar' })).toBeTruthy();
  });

  it('el evento message:updated del otro lado actualiza la burbuja', async () => {
    const theirs = text('77777777-7777-4777-8777-777777777777', 'Llego tarde', 1, OTHER);
    mocks.chatService.listMessages.mockResolvedValue([theirs]);
    renderScreen();
    await screen.findByText('Llego tarde');
    act(() => mocks.socket.onUpdated?.({ ...theirs, body: 'Llego en 5', editedAt: new Date().toISOString() }));
    expect(await screen.findByText('Llego en 5')).toBeTruthy();
  });
});

describe('mensajes temporales', () => {
  it('se activan desde la ficha del contacto, sin abrir otra hoja encima', async () => {
    mocks.chatService.listMessages.mockResolvedValue([]);
    mocks.chatService.setDisappearing.mockImplementation(async () => {
      // Como el servidor: desde ahora la lista de conversaciones trae el modo nuevo.
      mocks.chatService.listConversations.mockResolvedValue([summary({ disappearingSeconds: 604_800 })]);
      return { conversationId: CONV, disappearingSeconds: 604_800 };
    });
    renderScreen();

    fireEvent.click(await screen.findByTestId('chat-contact-header'));
    fireEvent.click(await screen.findByTestId('chat-contact-disappearing'));
    fireEvent.click(screen.getByTestId('chat-disappearing-604800'));

    await waitFor(() => expect(mocks.chatService.setDisappearing).toHaveBeenCalledWith(CONV, 604_800));
    expect(await screen.findByTestId('chat-header-disappearing')).toBeTruthy();
    expect(screen.getByText(/Temporales: 7 días/u)).toBeTruthy();
  });

  it('el aviso del otro entra al hilo y la cabecera cambia; lo caducado no se muestra', async () => {
    const expired = { ...text('88888888-8888-4888-8888-888888888888', 'Ya caducó', 30), expiresAt: new Date(Date.now() - 1000).toISOString() };
    const alive = { ...text('99999999-9999-4999-8999-999999999999', 'Sigue vivo', 1), expiresAt: new Date(Date.now() + 86_400_000).toISOString() };
    mocks.chatService.listMessages.mockResolvedValue([expired, alive]);
    renderScreen();

    expect(await screen.findByText('Sigue vivo')).toBeTruthy();
    expect(screen.queryByText('Ya caducó')).toBeNull();
    expect(screen.getByLabelText('Mensaje temporal')).toBeTruthy();

    act(() => mocks.socket.onMessage?.({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', conversationId: CONV, senderId: null, type: 'system',
      systemEvent: { kind: 'DISAPPEARING_MESSAGES_CHANGED', seconds: 86_400, changedByUserId: OTHER },
      createdAt: new Date().toISOString(),
    }));
    expect(await screen.findByText(/Ana Pérez activó los mensajes temporales/u)).toBeTruthy();
    expect(await screen.findByTestId('chat-header-disappearing')).toBeTruthy();
  });
});

describe('ubicación', () => {
  it('«Ubicación» abre la pantalla del mapa en vez de enviar directamente', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mocks.chatService.listMessages.mockResolvedValue([]);
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Adjuntar' }));
    fireEvent.click(await screen.findByTestId('chat-attach-location'));
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(mocks.push).toHaveBeenCalledWith({ pathname: '/chat/lugar', params: { conversationId: CONV } });
  });

  it('la burbuja dice el nombre del lugar elegido', async () => {
    mocks.chatService.listMessages.mockResolvedValue([{
      ...text('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '', 1), body: null, type: 'location',
      locationLat: -16.5, locationLng: -68.13, locationLabel: 'Gimnasio Sopocachi · Av. 20 de Octubre',
    }]);
    renderScreen();
    expect(await screen.findByText('Gimnasio Sopocachi · Av. 20 de Octubre')).toBeTruthy();
  });
});

describe('nota de voz', () => {
  it('al soltar sube el archivo que deja el grabador, una sola vez', async () => {
    mocks.chatService.listMessages.mockResolvedValue([]);
    mocks.voice.start.mockResolvedValue('recording');
    mocks.voice.stop.mockResolvedValue({ kind: 'ready', file: { uri: 'file:///voz.m4a', name: 'voice-message.m4a', mimeType: 'audio/mp4' }, durationMs: 3_200 });
    mocks.chatService.sendMediaMessage.mockResolvedValue({ ...text('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '', 0), body: null, type: 'audio', mediaUrl: '/x', mediaMimeType: 'audio/mp4' });
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Grabar' }));
    await waitFor(() => expect(mocks.voice.start).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Soltar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Soltar' }));

    await waitFor(() => expect(mocks.chatService.sendMediaMessage).toHaveBeenCalledTimes(1));
    expect(mocks.chatService.sendMediaMessage).toHaveBeenCalledWith(
      CONV,
      { uri: 'file:///voz.m4a', name: 'voice-message.m4a', mimeType: 'audio/mp4' },
      { type: 'audio', viewOnce: false },
    );
  });

  it('una nota demasiado corta no se sube y se explica', async () => {
    mocks.chatService.listMessages.mockResolvedValue([]);
    mocks.voice.stop.mockResolvedValue({ kind: 'too-short' });
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Soltar' }));
    await waitFor(() => expect(mocks.notify.info).toHaveBeenCalledWith('Mantén pulsado el micrófono al menos un segundo para grabar.'));
    expect(mocks.chatService.sendMediaMessage).not.toHaveBeenCalled();
  });
});
