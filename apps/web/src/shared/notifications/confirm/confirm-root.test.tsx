import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { confirm, confirmDelete, confirmStore } from '@gymsheet/notifications';
import { ConfirmRoot } from './confirm-root';

afterEach(() => {
  // Drain any prompt a failing assertion may have left open.
  if (confirmStore.getSnapshot()) confirmStore.resolveActive('dismiss');
});

describe('ConfirmRoot', () => {
  it('renders an accessible dialog with the prompt copy', async () => {
    render(<ConfirmRoot />);
    act(() => {
      void confirm({ title: 'Descartar cambios', message: '¿Seguro?' });
    });
    const dialog = await screen.findByRole('dialog');
    // Radix labels the dialog with its Title, giving it an accessible name.
    expect(dialog).toHaveAccessibleName('Descartar cambios');
    expect(screen.getByText('Descartar cambios')).toBeInTheDocument();
    expect(screen.getByText('¿Seguro?')).toBeInTheDocument();
  });

  it('resolves confirmed=true when the confirm button is pressed', async () => {
    render(<ConfirmRoot />);
    let result: Promise<{ confirmed: boolean }>;
    act(() => {
      result = confirm({ title: 'Publicar', message: 'M', confirmLabel: 'Publicar' });
    });
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    await expect(result!).resolves.toEqual({ confirmed: true, action: 'confirm' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('gives initial focus to Cancel on a destructive prompt', async () => {
    render(<ConfirmRoot />);
    act(() => {
      void confirmDelete({ entity: 'serie' });
    });
    await screen.findByRole('dialog');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus());
  });

  it('treats Escape as a dismiss, not a cancel', async () => {
    render(<ConfirmRoot />);
    let result: Promise<{ action: string }>;
    act(() => {
      result = confirm({ title: 'T', message: 'M' });
    });
    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    await expect(result!).resolves.toEqual({ confirmed: false, action: 'dismiss' });
  });
});
