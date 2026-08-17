// Genera un vídeo Y4M sintético para `--use-file-for-fake-video-capture` de
// Chromium. Dibuja un óvalo de tono piel sobre fondo oscuro: el detector
// heurístico debe encontrar exactamente una región compatible con un rostro,
// de modo que el E2E ejercita el camino real de detección y no un mock.
//
// Uso: node scripts/make-fake-face-video.mjs <salida.y4m> [frames]
import { writeFileSync } from 'node:fs';

const WIDTH = 640;
const HEIGHT = 480;
const FPS = 25;

// Tono de piel (222,170,135) → YCbCr (182,102,157): cae dentro de la ventana
// Cb 77–127 / Cr 133–173 que usa `isSkinTone`.
const SKIN = { y: 182, u: 102, v: 157 };
// Fondo (30,30,40) → luma 30, por debajo del umbral de 40: no es piel.
const BACKGROUND = { y: 30, u: 133, v: 126 };

/** Semieje del óvalo: cobertura ≈ 11 % del encuadre y proporción alto/ancho 1.33. */
const RADIUS_X = 90;
const RADIUS_Y = 120;

function insideFace(x, y, centreX, centreY) {
  const dx = (x - centreX) / RADIUS_X;
  const dy = (y - centreY) / RADIUS_Y;
  return dx * dx + dy * dy <= 1;
}

function renderFrame(centreX, centreY) {
  const luma = Buffer.alloc(WIDTH * HEIGHT);
  const chromaWidth = WIDTH / 2;
  const chromaHeight = HEIGHT / 2;
  const chromaBlue = Buffer.alloc(chromaWidth * chromaHeight);
  const chromaRed = Buffer.alloc(chromaWidth * chromaHeight);

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const skin = insideFace(x, y, centreX, centreY);
      luma[y * WIDTH + x] = skin ? SKIN.y : BACKGROUND.y;
    }
  }
  // 4:2:0: cada muestra de croma cubre un bloque 2×2 de luma.
  for (let y = 0; y < chromaHeight; y += 1) {
    for (let x = 0; x < chromaWidth; x += 1) {
      const skin = insideFace(x * 2, y * 2, centreX, centreY);
      chromaBlue[y * chromaWidth + x] = skin ? SKIN.u : BACKGROUND.u;
      chromaRed[y * chromaWidth + x] = skin ? SKIN.v : BACKGROUND.v;
    }
  }
  return Buffer.concat([Buffer.from('FRAME\n'), luma, chromaBlue, chromaRed]);
}

const [, , output = 'fake-face.y4m', frameCount = '50'] = process.argv;
const frames = [Buffer.from(`YUV4MPEG2 W${WIDTH} H${HEIGHT} F${FPS}:1 Ip A1:1 C420mpeg2\n`)];
for (let index = 0; index < Number(frameCount); index += 1) {
  // Ligero vaivén horizontal: prueba que la detección sigue al sujeto en vez
  // de acertar por un encuadre estático afortunado.
  const centreX = WIDTH / 2 + Math.round(Math.sin((index / Number(frameCount)) * Math.PI * 2) * 30);
  frames.push(renderFrame(centreX, HEIGHT / 2));
}
writeFileSync(output, Buffer.concat(frames));
process.stdout.write(`${output}: ${frameCount} frames ${WIDTH}x${HEIGHT}\n`);
