import type { RatingSummary } from './core';
import type { TrainingGoal } from './enums';

/** Pestañas del catálogo de rutinas (RF-01): Públicas, REPP, Mías y Compartidas conmigo. */
export const routineCatalogScopes = ['public', 'official', 'mine', 'shared'] as const;
export type RoutineCatalogScope = (typeof routineCatalogScopes)[number];

export const routineCatalogOrders = ['recientes', 'valoradas', 'populares'] as const;
export type RoutineCatalogOrder = (typeof routineCatalogOrders)[number];

/** Parámetros de `GET /routines?scope=…`; todo lo que falte lo resuelve el servidor. */
export type RoutineCatalogQuery = {
  scope: RoutineCatalogScope;
  q?: string;
  objetivo?: TrainingGoal;
  diasPorSemana?: number;
  deMiGimnasio?: boolean;
  orden?: RoutineCatalogOrder;
  cursor?: string;
  limit?: number;
};

/** Un día de la semana en la miniatura de la tarjeta. `ejerciciosTotal` es nulo si la invitación está sin aceptar. */
export type RoutineCardDay = {
  diaSemana: number | null;
  nombre: string | null;
  ejerciciosTotal: number | null;
};

/** La invitación pendiente (o aceptada) que trae la tarjeta en «Compartidas conmigo». */
export type RoutineCardInvitation = {
  id: string;
  estado: string;
  origen: string;
  deParte: { id: string; nombre: string };
};

export type RoutineCard = {
  id: string;
  nombre: string;
  descripcion: string | null;
  objetivo: TrainingGoal | null;
  duracionSemanas: number | null;
  diasPorSemana: number;
  /** Nulo mientras la invitación no se acepte: no se enseña el contenido. */
  ejerciciosTotal: number | null;
  visibilidad: string;
  esOficial: boolean;
  esMia: boolean;
  autor: { id: string; nombre: string };
  atribucion: { routineName: string; authorId: string | null; authorName: string } | null;
  valoracion: RatingSummary;
  copias: number;
  publicadaEn: string | null;
  version: number;
  estadoModeracion: string;
  dias: RoutineCardDay[];
  invitacion: RoutineCardInvitation | null;
};

export type RoutineCatalogPage = { items: RoutineCard[]; siguienteCursor: string | null };
