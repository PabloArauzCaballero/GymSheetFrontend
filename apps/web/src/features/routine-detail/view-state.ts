/**
 * Qué parte de la rutina se está mirando, guardado en la URL
 * (`?vista=mes&semana=2&dia=<id>`): al volver de la ficha de un ejercicio con el
 * botón Atrás se cae en la misma vista, en la misma semana y en el mismo día.
 */
export type DetailView = {
  vista: 'semana' | 'mes';
  semana: number;
  dia: string | null;
};

type Params = { get(name: string): string | null };

export function parseDetailView(params: Params, totalWeeks: number): DetailView {
  const week = Number(params.get('semana'));
  const day = params.get('dia');
  return {
    vista: params.get('vista') === 'mes' ? 'mes' : 'semana',
    semana: Number.isInteger(week) && week >= 1 && week <= Math.max(1, totalWeeks) ? week : 1,
    dia: day && /^[A-Za-z0-9-]{8,64}$/u.test(day) ? day : null,
  };
}

export function detailSearch(view: DetailView): string {
  const params = new URLSearchParams();
  if (view.vista === 'mes') params.set('vista', 'mes');
  if (view.semana !== 1) params.set('semana', String(view.semana));
  if (view.dia) params.set('dia', view.dia);
  return params.toString();
}
