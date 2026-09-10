import { describe, expect, it } from 'vitest';
import { signedMediaSrc, verifyMediaSignature } from './media-signing';

const external = 'https://cdn.example.com/gyms/branch-1.jpg';

describe('firma del proxy de imágenes', () => {
  it('la ruta firmada verifica contra su propia url', () => {
    const src = signedMediaSrc(external);
    const params = new URLSearchParams(src.slice(src.indexOf('?') + 1));
    expect(params.get('url')).toBe(external);
    expect(verifyMediaSignature(params.get('url')!, params.get('sig'))).toBe(true);
  });

  it('rechaza una url sin firma', () => {
    expect(verifyMediaSignature(external, null)).toBe(false);
    expect(verifyMediaSignature(external, '')).toBe(false);
  });

  it('rechaza una firma que no corresponde a la url', () => {
    const src = signedMediaSrc(external);
    const sig = new URLSearchParams(src.slice(src.indexOf('?') + 1)).get('sig');
    // Otra url con la firma de la primera: es justo el vector de proxy abierto.
    expect(verifyMediaSignature('https://cdn.example.com/otra.jpg', sig)).toBe(false);
    expect(verifyMediaSignature(external, `${sig}x`)).toBe(false);
  });

  it('no proxya urls locales ni data:', () => {
    expect(signedMediaSrc('/local/foto.png')).toBe('/local/foto.png');
    expect(signedMediaSrc('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });
});
