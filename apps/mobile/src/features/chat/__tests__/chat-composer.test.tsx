import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', async () => (await import('./rn-dom')).reactNativeMock());
vi.mock('@/theme', async () => (await import('./rn-dom')).themeMock());
vi.mock('react-native-reanimated', async () => (await import('./rn-dom')).reanimatedMock());
vi.mock('react-native-gesture-handler', async () => (await import('./rn-dom')).gestureHandlerMock());
vi.mock('expo-haptics', () => ({ impactAsync: vi.fn(), notificationAsync: vi.fn(), ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('@/components/motion', async () => ({ PressableScale: (await import('./rn-dom')).Press }));
vi.mock('@/notifications/use-reduce-motion', () => ({ useReduceMotion: () => true }));
vi.mock('@/notifications', () => ({ notify: { info: vi.fn() } }));

import { ChatComposer } from '../chat-composer';

function Harness({ onAttach = vi.fn(), replying = null }: { onAttach?: (kind: string) => void; replying?: { author: string; preview: string; ownQuote: boolean } | null }) {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  return (
    <ChatComposer
      attachOpen={open}
      busy={false}
      draft={draft}
      editing={null}
      onAttach={(kind) => {
        setOpen(false);
        onAttach(kind);
      }}
      onCancelEdit={vi.fn()}
      onCancelReply={vi.fn()}
      onChangeDraft={setDraft}
      onSend={vi.fn()}
      onToggleAttach={() => setOpen((value) => !value)}
      onVoiceStart={vi.fn()}
      onVoiceStop={vi.fn()}
      recording={false}
      recordingMillis={0}
      replying={replying}
      sending={false}
    />
  );
}

describe('redactor como WhatsApp', () => {
  it('fuera del «+» solo está el micrófono: ni emoji ni cámara sueltos', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Adjuntar' })).toBeTruthy();
    expect(screen.getByLabelText('Nota de voz')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Emoji' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cámara' })).toBeNull();
  });

  it('el «+» despliega exactamente los cinco iconos y cada uno llama a su acción', () => {
    const onAttach = vi.fn();
    render(<Harness onAttach={onAttach} />);
    fireEvent.click(screen.getByRole('button', { name: 'Adjuntar' }));
    const menu = screen.getByTestId('chat-attach-menu');
    const names = within(menu).getAllByRole('button').map((button) => button.getAttribute('aria-label'));
    expect(names).toEqual(['Emoji', 'Foto', 'Cámara', 'Ubicación', 'Vista única']);
    fireEvent.click(within(menu).getByRole('button', { name: 'Vista única' }));
    expect(onAttach).toHaveBeenCalledWith('viewOnce');
    expect(screen.queryByTestId('chat-attach-menu')).toBeNull();
  });

  it('al escribir, el micrófono se convierte en enviar', () => {
    render(<Harness />);
    expect(screen.queryByRole('button', { name: 'Enviar mensaje' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Escribe un mensaje'), { target: { value: 'Hola' } });
    expect(screen.getByRole('button', { name: 'Enviar mensaje' })).toBeTruthy();
    expect(screen.queryByLabelText('Nota de voz')).toBeNull();
  });

  it('respondiendo, la cita va dentro del campo con su X', () => {
    render(<Harness replying={{ author: 'Ana', preview: '¿Pierna hoy?', ownQuote: false }} />);
    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.getByText('¿Pierna hoy?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar respuesta' })).toBeTruthy();
  });
});
