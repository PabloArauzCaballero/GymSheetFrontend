import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MediaSourceDialog } from './media-source-dialog';

let answerProbe: (present: boolean) => void = () => undefined;
vi.mock('@/shared/lib/camera/camera-adapter', () => ({
  hasCameraDevice: () => new Promise<boolean>((resolve) => (answerProbe = resolve)),
}));
vi.mock('@/shared/components/media/camera-capture', () => ({ CameraCapture: () => <p>Cámara</p> }));

describe('MediaSourceDialog', () => {
  // The flaky photo upload: the camera probe answered while the file chooser was open, the input the
  // chooser belonged to was replaced, and the picked file fired `change` on a detached node.
  it('keeps the same file input when the camera probe answers, so a file picked meanwhile is not lost', async () => {
    const onPick = vi.fn();
    render(<MediaSourceDialog captureFileName="foto" onOpenChange={() => undefined} onPick={onPick} open title="Añadir una foto" />);
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    expect(input).not.toBeNull();

    await act(async () => answerProbe(true));
    expect(screen.getByRole('tab', { name: 'Cámara' })).toBeTruthy();
    expect(document.querySelector('input[type=file]')).toBe(input);
    expect(input.isConnected).toBe(true);

    const file = new File(['x'], 'cara.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onPick).toHaveBeenCalledWith(file);
  });

  // Opened from state (not a Dialog.Trigger): focus used to fall to <body> on close, because the opener was
  // read on DialogContent's first render — while the dialog was still closed.
  it('gives focus back to the button that opened it, after Escape and after a pick', async () => {
    function Opener() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)} type="button">Agregar foto</button>
          <MediaSourceDialog captureFileName="foto" onOpenChange={setOpen} onPick={() => undefined} open={open} title="Añadir una foto" />
        </>
      );
    }
    render(<Opener />);
    const opener = screen.getByRole('button', { name: 'Agregar foto' });
    for (const close of ['escape', 'pick'] as const) {
      opener.focus();
      fireEvent.click(opener);
      expect(await screen.findByRole('dialog')).toBeTruthy();
      expect(document.activeElement).not.toBe(opener);
      if (close === 'escape') fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
      else fireEvent.change(document.querySelector('input[type=file]') as HTMLInputElement, { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } });
      // Radix hands focus back on a timer after the content unmounts.
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(opener));
    }
  });
});
