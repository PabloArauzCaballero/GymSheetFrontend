import { IMAGE_ASPECT, REGIONS, REGION_VIEWBOX, containFrame, hitTest } from '@gymsheet/anatomy';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BodyMap } from './body-map';

/**
 * Lo que se fija: que un clic en la imagen abra el músculo que hay debajo
 * —con la misma geometría que el móvil— y que el teclado llegue al mismo sitio
 * sin ratón.
 */

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean; quality?: number }) => {
    const rest = { ...props };
    delete rest.priority;
    delete rest.quality;
    // eslint-disable-next-line @next/next/no-img-element -- doble de prueba de next/image
    return <img {...rest} alt={rest.alt ?? ''} />;
  },
}));

const SIZE = { width: 500, height: 800 };
// Las mismas franjas que reserva el componente para herramientas y leyenda.
const INSET_TOP = 56;
const INSET_BOTTOM = 52;

// jsdom no implementa PointerEvent: sin esto el evento llega como un `Event`
// pelado, sin coordenadas, y el clic nunca cae sobre nada.
class TestPointerEvent extends MouseEvent {
  readonly pointerId: number;
  readonly pointerType: string;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? 'mouse';
  }
}

beforeEach(() => {
  push.mockReset();
  vi.stubGlobal('PointerEvent', TestPointerEvent);
  // Sin animación ni retardo: el clic navega en el acto.
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce'),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe() {
        this.callback([{ contentRect: SIZE } as ResizeObserverEntry], this as unknown as ResizeObserver);
      }
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: SIZE.width,
    height: SIZE.height,
  } as DOMRect);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Un punto de pantalla que cae dentro del músculo, buscado sobre su caja. */
function screenPointInside(code: string) {
  const regions = REGIONS['surface-front'] ?? [];
  const inner = containFrame({ width: SIZE.width, height: SIZE.height - INSET_TOP - INSET_BOTTOM }, IMAGE_ASPECT);
  for (let y = 0; y < REGION_VIEWBOX.height; y += 10) {
    for (let x = 0; x < REGION_VIEWBOX.width; x += 10) {
      if (hitTest(regions, x, y)?.code === code) {
        return {
          clientX: inner.x + (x / REGION_VIEWBOX.width) * inner.width,
          clientY: INSET_TOP + inner.y + (y / REGION_VIEWBOX.height) * inner.height,
        };
      }
    }
  }
  throw new Error(`sin punto para ${code}`);
}

describe('BodyMap (web)', () => {
  it('un clic sobre el abdomen abre el recto abdominal', () => {
    const { container } = render(<BodyMap />);
    const canvas = container.querySelector('.touch-none') as HTMLElement;
    const point = screenPointInside('RECTUS_ABDOMINIS');
    fireEvent.pointerDown(canvas, { ...point, button: 0, pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerUp(canvas, { ...point, button: 0, pointerId: 1, pointerType: 'mouse' });
    vi.runAllTimers();
    expect(push).toHaveBeenCalledWith('/exercises/muscle/RECTUS_ABDOMINIS');
  });

  it('el teclado abre el mismo músculo con Intro', () => {
    render(<BodyMap />);
    const muscle = screen.getByRole('button', { name: 'Recto abdominal: ver ejercicios' });
    muscle.focus();
    fireEvent.keyDown(muscle, { key: 'Enter' });
    vi.runAllTimers();
    expect(push).toHaveBeenCalledWith('/exercises/muscle/RECTUS_ABDOMINIS');
  });

  it('un clic fuera del cuerpo no navega', () => {
    const { container } = render(<BodyMap />);
    const canvas = container.querySelector('.touch-none') as HTMLElement;
    const corner = { clientX: 5, clientY: SIZE.height - 5 };
    fireEvent.pointerDown(canvas, { ...corner, button: 0, pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerUp(canvas, { ...corner, button: 0, pointerId: 1, pointerType: 'mouse' });
    vi.runAllTimers();
    expect(push).not.toHaveBeenCalled();
  });
});
