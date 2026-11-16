import { act, fireEvent, render, screen } from '@testing-library/react';
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
});
