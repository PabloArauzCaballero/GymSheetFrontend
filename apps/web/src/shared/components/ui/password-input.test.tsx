import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordInput } from './input';

describe('PasswordInput', () => {
  it('no capitaliza ni autocorrige, tampoco al revelar la contraseña', () => {
    render(<PasswordInput aria-label="Contraseña" hideLabel="Ocultar" showLabel="Mostrar" />);
    const field = screen.getByLabelText('Contraseña');
    const expectRawTyping = () => {
      expect(field.getAttribute('autocapitalize')).toBe('none');
      expect(field.getAttribute('autocorrect')).toBe('off');
      expect(field.getAttribute('spellcheck')).toBe('false');
    };
    expectRawTyping();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar' }));
    expectRawTyping();
    expect(field.getAttribute('type')).toBe('text');
  });

  it('el llamador no puede volver a activar la mayúscula automática', () => {
    render(
      <PasswordInput
        aria-label="Contraseña"
        autoCapitalize="sentences"
        hideLabel="Ocultar"
        showLabel="Mostrar"
      />,
    );
    expect(screen.getByLabelText('Contraseña').getAttribute('autocapitalize')).toBe('none');
  });
});
