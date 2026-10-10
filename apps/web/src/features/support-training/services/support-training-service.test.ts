import { describe, expect, it } from 'vitest';
import { recomputeMessage } from '../components/support-labels';
import {
  recomputeReasons,
  recomputeResultSchema,
  supportTrainingSchema,
} from './support-training-service';

const id = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';

const payload = {
  usuarioId: id,
  puntosDeModo: 120,
  rutinas: { total: 3, publicas: 1, ocultas: 0 },
  programas: [
    {
      id,
      carril: 'STRENGTH',
      modo: 'PROGRESSIVE_OVERLOAD',
      estado: 'ACTIVE',
      motivoCierre: null,
      rutinaId: id,
      rutinaNombre: 'Fuerza base',
      cardioPlanId: null,
      fechaInicio: '2026-09-07',
      fechaFinPrevista: '2026-10-04',
      semanaActual: 5,
      semanasTotales: 5,
      multiplicador: 1.2,
      proximoMultiplicador: 1.4,
      sesionesHechasSemana: 0,
      sesionesPlanSemana: 2,
      esDescarga: false,
      metas: [],
      semanas: [
        {
          numero: 1,
          inicio: '2026-09-07',
          esDescarga: false,
          sesionesPlan: 2,
          sesionesHechas: 2,
          cardioMinutos: 0,
          cumplida: true,
          multiplicador: 1.2,
          cerradaEn: '2026-09-14T03:00:00.000Z',
        },
      ],
      bonos: [
        {
          semana: 1,
          motivo: 'SEMANA_CUMPLIDA',
          multiplicador: '1.20',
          puntosBase: 100,
          puntosBonus: 20,
          creadoEn: '2026-09-14T03:00:00.000Z',
        },
      ],
    },
  ],
  invitaciones: [
    { id, estado: 'PENDING', origen: null, creadaEn: '2026-10-01T10:00:00.000Z', rutinaNombre: 'Pierna', deParte: 'Ana' },
  ],
  ultimasSesiones: [
    { id, inicio: '2026-10-01T10:00:00.000Z', fin: null, estado: 'ACTIVE', programaId: null, series: 4 },
  ],
};

describe('soporte de entrenamiento: contrato', () => {
  it('lee la ficha del backend y normaliza el multiplicador del libro de bonos', () => {
    const parsed = supportTrainingSchema.parse(payload);
    expect(parsed.programas[0]?.bonos[0]?.multiplicador).toBe(1.2);
    expect(parsed.programas[0]?.semanas[0]?.cumplida).toBe(true);
  });

  it('acepta una ficha sin programas, invitaciones ni sesiones', () => {
    const empty = { ...payload, programas: [], invitaciones: [], ultimasSesiones: [] };
    expect(supportTrainingSchema.safeParse(empty).success).toBe(true);
  });

  it('acepta los cinco resultados del recálculo y rechaza uno inventado', () => {
    for (const motivo of recomputeReasons) {
      expect(recomputeResultSchema.safeParse({ recalculada: false, motivo }).success).toBe(true);
    }
    expect(recomputeResultSchema.safeParse({ recalculada: false, motivo: 'RARO' }).success).toBe(false);
  });

  it('explica cada resultado sin prometer que se restan puntos', () => {
    expect(recomputeMessage({ recalculada: true, motivo: 'CUMPLIDA', multiplicador: 1.4, bono: 30 })).toMatch(
      /cumplida.*×1\.40.*30 puntos/u,
    );
    for (const motivo of recomputeReasons) {
      expect(recomputeMessage({ recalculada: false, motivo }).length).toBeGreaterThan(10);
    }
  });
});
