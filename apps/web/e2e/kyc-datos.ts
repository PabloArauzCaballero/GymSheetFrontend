import { deflateSync } from 'node:zlib';

/**
 * Test photos for the business KYC (franja 8b). The backend judges
 * readability with `sharp` (short side ≥ 800 px, luminance spread and
 * exposure), so a 1×1 pixel is «Vuelve a tomarla». This draws a grey
 * checkerboard PNG that passes every threshold, without any image library.
 */
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([head, body, crc]);
}

/** A readable grayscale PNG: `square`-px checkerboard of two mid greys (mean ≈ 125, wide spread). */
export function readablePhoto(width = 1000, height = 1000, square = 50): Buffer {
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(width + 1);
    for (let x = 0; x < width; x += 1) row[x + 1] = (Math.floor(x / square) + Math.floor(y / square)) % 2 === 0 ? 40 : 210;
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 0; // grayscale
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Digits that differ per run, so the NIT, CI and phone checks never see a previous run as a duplicate. */
export function runDigits(length: number): string {
  let digits = `${Date.now()}${Math.floor(Math.random() * 1e6)}`.replace(/\D/gu, '');
  while (digits.length < length) digits += Math.floor(Math.random() * 10);
  return digits.slice(-length);
}
