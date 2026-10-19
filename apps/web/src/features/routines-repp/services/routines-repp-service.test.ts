import { describe, expect, it } from 'vitest';
import {
  adminRoutinePageSchema,
  adminRoutinesPath,
  routineInsightsSchema,
} from './routines-repp-service';

const row = {
  id: '0190e2cb-a6d4-7ec3-8f91-a6c735631501',
  nombre: 'Fuerza base',
  visibilidad: 'PUBLIC',
  esOficial: true,
  estado: 'ACTIVE',
  estadoModeracion: 'VISIBLE',
  version: 1,
  copias: 4,
  valoracionPromedio: '4.50',
  valoracionTotal: 2,
  publicadaEn: '2026-10-08T16:50:56.786Z',
  autorId: '0190e2cb-a6d4-7ec3-8f91-a6c735631502',
  autorNombre: 'REPP',
  denunciasAbiertas: 0,
};

describe('rutinas REPP: contrato del listado', () => {
  it('acepta la página del backend y convierte el promedio que llega como texto', () => {
    const page = adminRoutinePageSchema.parse({ items: [row], siguienteCursor: 'MjA' });
    expect(page.items[0]?.valoracionPromedio).toBe(4.5);
    expect(page.siguienteCursor).toBe('MjA');
  });

  it('acepta una rutina sin valoraciones y rechaza un estado de moderación inventado', () => {
    expect(
      adminRoutinePageSchema.parse({ items: [{ ...row, valoracionPromedio: null }], siguienteCursor: null })
        .items[0]?.valoracionPromedio,
    ).toBeNull();
    expect(
      adminRoutinePageSchema.safeParse({
        items: [{ ...row, estadoModeracion: 'BORRADA' }],
        siguienteCursor: null,
      }).success,
    ).toBe(false);
  });

  it('lee los insights', () => {
    const insights = routineInsightsSchema.parse({
      id: row.id,
      nombre: row.nombre,
      version: 1,
      copias: 3,
      activaciones: 2,
      valoracionPromedio: null,
      valoracionTotal: 0,
      comentarios: 1,
      denuncias: 0,
      copiasVivas: 2,
    });
    expect(insights.copiasVivas).toBe(2);
  });
});

describe('rutinas REPP: filtros del listado', () => {
  it('sólo manda los filtros puestos, y oficial=false se manda', () => {
    expect(adminRoutinesPath({})).toBe('/admin/routines?limit=20');
    expect(adminRoutinesPath({ oficial: false, q: 'fuerza', cursor: 'MjA' })).toBe(
      '/admin/routines?limit=20&oficial=false&q=fuerza&cursor=MjA',
    );
    expect(adminRoutinesPath({ estadoModeracion: 'OCULTA_AUTO' })).toContain(
      'estadoModeracion=OCULTA_AUTO',
    );
  });
});
