import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchExternalMedia } from './media-proxy';

// La resolución DNS es la guardia anti-SSRF del módulo: se controla desde aquí
// para poder decidir si un host «externo» apunta a la red interna o no.
const lookup = vi.hoisted(() => vi.fn());
vi.mock('node:dns/promises', () => ({ default: { lookup }, lookup }));

const PUBLIC_HOST = 'https://media.example.com/story';

function publicAddress() {
  lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
}

function upstream(body: BodyInit | null, status: number, headers: Record<string, string>) {
  const responder = vi.fn().mockResolvedValue(new Response(body, { status, headers }));
  vi.stubGlobal('fetch', responder);
  return responder;
}

function streamOf(bytes: number[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(bytes));
      controller.close();
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('fetchExternalMedia', () => {
  it('sirve un vídeo como flujo y devuelve el rango que dio el origen', async () => {
    publicAddress();
    const responder = upstream(streamOf([1, 2, 3]), 206, {
      'content-type': 'video/mp4',
      'content-length': '3',
      'content-range': 'bytes 0-2/4096',
      'accept-ranges': 'bytes',
    });

    const result = await fetchExternalMedia(`${PUBLIC_HOST}.mp4`, 'bytes=0-2');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 206 y `Content-Range` intactos: sin ellos el navegador no puede buscar
    // dentro del vídeo ni empezar antes de tenerlo entero.
    expect(result.status).toBe(206);
    expect(result.contentType).toBe('video/mp4');
    expect(result.headers).toEqual({
      'content-length': '3',
      'content-range': 'bytes 0-2/4096',
      'accept-ranges': 'bytes',
    });
    expect(result.body).toBeInstanceOf(ReadableStream);
    const sent = responder.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(sent.Range).toBe('bytes=0-2');
  });

  it('rechaza un vídeo que declara más bytes de los que el almacén puede tener', async () => {
    publicAddress();
    upstream(streamOf([1]), 200, {
      'content-type': 'video/mp4',
      'content-length': String(64 * 1024 * 1024),
    });

    await expect(fetchExternalMedia(`${PUBLIC_HOST}.mp4`)).resolves.toEqual({
      ok: false,
      status: 413,
    });
  });

  it('sigue leyendo las imágenes enteras y sin cabeceras de rango', async () => {
    publicAddress();
    upstream(new Uint8Array([1, 2, 3]), 200, { 'content-type': 'image/png' });

    const result = await fetchExternalMedia(`${PUBLIC_HOST}.png`);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe(200);
    expect(result.body).toBeInstanceOf(ArrayBuffer);
    expect(result.headers).toEqual({ 'content-length': '3' });
  });

  it('no reenvía un tipo que no sea imagen ni vídeo admitidos', async () => {
    publicAddress();
    upstream('%PDF-1.7', 200, { 'content-type': 'application/pdf' });

    await expect(fetchExternalMedia(`${PUBLIC_HOST}.pdf`)).resolves.toEqual({
      ok: false,
      status: 415,
    });
  });

  it('no sale a buscar nada si el destino resuelve a la red interna', async () => {
    lookup.mockResolvedValue([{ address: '10.0.0.7', family: 4 }]);
    const responder = upstream(null, 200, {});

    await expect(fetchExternalMedia('https://interno.example.com/a.mp4')).resolves.toEqual({
      ok: false,
      status: 400,
    });
    expect(responder).not.toHaveBeenCalled();
  });
});
