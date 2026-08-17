// Genera un PNG con aspecto de código QR para ejercitar la carga de medios en
// E2E sin depender de un binario externo ni de un archivo versionado.
// No codifica datos reales: sólo debe ser un PNG válido dentro de los MIME y
// el tamaño que acepta el backend.
//
// Uso: node scripts/make-fake-qr.mjs <salida.png> [módulos]
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const SCALE = 8;
const QUIET_ZONE = 2;

/** Patrón determinista: mismo archivo en cada ejecución, útil para comparar evidencia. */
function isDark(row, column, modules) {
  const inFinder = (originRow, originColumn) => {
    const deltaRow = row - originRow;
    const deltaColumn = column - originColumn;
    if (deltaRow < 0 || deltaRow > 6 || deltaColumn < 0 || deltaColumn > 6) return false;
    const ring = Math.max(Math.abs(deltaRow - 3), Math.abs(deltaColumn - 3));
    return ring !== 2;
  };
  if (inFinder(0, 0) || inFinder(0, modules - 7) || inFinder(modules - 7, 0)) return true;
  const hash = createHash('sha256').update(`${row}:${column}`).digest()[0] ?? 0;
  return hash % 2 === 0;
}

function encodePng(width, height, rgb) {
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crcTable = Buffer.alloc(4);
    let crc = 0xffffffff;
    for (const byte of body) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
      }
    }
    crcTable.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, body, crcTable]);
  };

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // profundidad de bits
  header[9] = 2; // color type: RGB
  // Cada fila lleva su byte de filtro (0 = sin filtro) antes de los píxeles.
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0;
    rgb.copy(raw, rowStart + 1, y * width * 3, (y + 1) * width * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const [, , output = 'fake-qr.png', moduleCount = '25'] = process.argv;
const modules = Number(moduleCount);
const side = (modules + QUIET_ZONE * 2) * SCALE;
const rgb = Buffer.alloc(side * side * 3, 0xff);
for (let y = 0; y < side; y += 1) {
  for (let x = 0; x < side; x += 1) {
    const row = Math.floor(y / SCALE) - QUIET_ZONE;
    const column = Math.floor(x / SCALE) - QUIET_ZONE;
    const inside = row >= 0 && row < modules && column >= 0 && column < modules;
    if (inside && isDark(row, column, modules)) {
      rgb.fill(0x00, (y * side + x) * 3, (y * side + x) * 3 + 3);
    }
  }
}
writeFileSync(output, encodePng(side, side, rgb));
process.stdout.write(`${output}: ${side}x${side}\n`);
