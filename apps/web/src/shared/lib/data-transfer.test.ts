import { afterEach, describe, expect, it, vi } from 'vitest';
import { base64ToBlob, saveBlob } from './data-transfer';

// jsdom's Blob has no `arrayBuffer()`; FileReader is what it does implement.
const bytesOf = (blob: Blob) =>
  new Promise<Uint8Array>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(blob);
  });

describe('saveBlob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('clicks an attached anchor with the filename and revokes the URL afterwards', () => {
    vi.useFakeTimers();
    const create = vi.fn(() => 'blob:repp');
    const revoke = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
    let attachedOnClick = false;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      attachedOnClick = document.body.querySelector('a[download]') !== null;
    });

    saveBlob(new Blob(['x'], { type: 'application/pdf' }), 'repp-avance.pdf');

    const clicked = click.mock.contexts[0] as HTMLAnchorElement;
    expect(attachedOnClick).toBe(true);
    expect(clicked.download).toBe('repp-avance.pdf');
    expect(clicked.href).toBe('blob:repp');
    expect(document.body.contains(clicked)).toBe(false);
    expect(revoke).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:repp');
  });
});

describe('base64ToBlob', () => {
  it('turns a corrupt payload into a readable Spanish error', () => {
    expect(() => base64ToBlob('@@@', 'application/pdf')).toThrow('El archivo recibido está dañado. Vuelve a intentarlo.');
  });

  it('keeps binary bytes intact and sets the mime type', async () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0xff, 0x00, 0x80]);
    const blob = base64ToBlob(btoa(String.fromCharCode(...bytes)), 'application/pdf');
    expect(blob.type).toBe('application/pdf');
    expect(await bytesOf(blob)).toEqual(bytes);
  });
});
