import { describe, expect, it } from 'vitest';
import { detailSearch, parseDetailView } from './view-state';

const parse = (search: string, weeks = 12) => parseDetailView(new URLSearchParams(search), weeks);

describe('vista del detalle en la URL', () => {
  it('arranca en Semana 1 sin día elegido', () => {
    expect(parse('')).toEqual({ vista: 'semana', semana: 1, dia: null });
  });

  it('recuerda Mes, la semana y el día', () => {
    const view = parse('vista=mes&semana=2&dia=0190e2cb-a6d4-7ec3');
    expect(view).toEqual({ vista: 'mes', semana: 2, dia: '0190e2cb-a6d4-7ec3' });
    expect(parse(detailSearch(view))).toEqual(view);
  });

  it('descarta semanas fuera de rango y días con caracteres raros', () => {
    expect(parse('semana=13').semana).toBe(1);
    expect(parse('semana=0').semana).toBe(1);
    expect(parse('semana=abc').semana).toBe(1);
    expect(parse('dia=<script>').dia).toBeNull();
  });

  it('no escribe lo que es lo de siempre', () => {
    expect(detailSearch({ vista: 'semana', semana: 1, dia: null })).toBe('');
  });
});
