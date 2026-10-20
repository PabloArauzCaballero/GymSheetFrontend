const ZWJ = 0x200d;
const VARIATION_SELECTOR_16 = 0xfe0f;
const isModifier = (code: number | undefined) =>
  code === VARIATION_SELECTOR_16 || (code !== undefined && code >= 0x1f3fb && code <= 0x1f3ff);

/** Quita un símbolo con los modificadores que lleva detrás (tono de piel, VS16). */
function popSymbol(points: string[]): void {
  let removed = points.pop()?.codePointAt(0);
  while (isModifier(removed)) removed = points.pop()?.codePointAt(0);
}

/**
 * Borra el último símbolo visible, como la tecla de borrar del teclado: un
 * emoji compuesto (👍🏽, ❤️‍🔥, 🏋️‍♀️) son varios puntos de código unidos y se va
 * entero, no a pedazos.
 */
export function dropLastSymbol(text: string): string {
  const points = Array.from(text);
  popSymbol(points);
  while (points.at(-1)?.codePointAt(0) === ZWJ) {
    points.pop();
    popSymbol(points);
  }
  return points.join('');
}
