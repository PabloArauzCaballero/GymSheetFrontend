export const userRoles = ['ADMIN', 'CLIENTE', 'ENTRENADOR_EXTERNO', 'COACH', 'FRONT_DESK'] as const;
export type UserRole = (typeof userRoles)[number];

export const trainingGoals = [
  'HIPERTROFIA',
  'FUERZA',
  'RESISTENCIA',
  'PERDIDA_GRASA',
  'SALUD_GENERAL',
  'REHABILITACION',
] as const;
export type TrainingGoal = (typeof trainingGoals)[number];

export const equipmentTypes = [
  'MAQUINA',
  'MANCUERNA',
  'BARRA',
  'DISCO',
  'BANCO',
  'POLEA',
  'BANDA',
  'ACCESORIO',
  'OTRO',
] as const;
export type EquipmentType = (typeof equipmentTypes)[number];

export const equipmentStatuses = ['DISPONIBLE', 'MANTENIMIENTO', 'INACTIVO'] as const;
export type EquipmentStatus = (typeof equipmentStatuses)[number];

export const workoutStatuses = ['EN_PROGRESO', 'FINALIZADA', 'CANCELADA'] as const;
export type WorkoutStatus = (typeof workoutStatuses)[number];

export const routineVisibilities = ['PRIVATE', 'SHARED', 'TEMPLATE'] as const;
export type RoutineVisibility = (typeof routineVisibilities)[number];

export const routineStatuses = ['ACTIVE', 'ARCHIVED'] as const;
export type RoutineStatus = (typeof routineStatuses)[number];

export const routineAssignmentStatuses = ['ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
export type RoutineAssignmentStatus = (typeof routineAssignmentStatuses)[number];

export const membershipStatuses = ['ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED'] as const;
export type MembershipStatus = (typeof membershipStatuses)[number];

export const planTypes = [
  'DAY_PASS',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'SEMIANNUAL',
  'ANNUAL',
  'CUSTOM',
] as const;
export type PlanType = (typeof planTypes)[number];

export const roomTypes = [
  'TRAINING',
  'CARDIO',
  'FUNCTIONAL',
  'CLASSROOM',
  'LOCKER',
  'RECEPTION',
  'STAFF',
  'OTHER',
] as const;
export type RoomType = (typeof roomTypes)[number];

export const maintenanceTypes = ['PREVENTIVE', 'CORRECTIVE', 'INSPECTION'] as const;
export type MaintenanceType = (typeof maintenanceTypes)[number];

export const maintenanceStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export type MaintenanceStatus = (typeof maintenanceStatuses)[number];

export const credentialTypes = ['PIN', 'FACE', 'FINGERPRINT'] as const;
export type CredentialType = (typeof credentialTypes)[number];

export const credentialStatuses = ['ACTIVE', 'SUSPENDED', 'REVOKED'] as const;
export type CredentialStatus = (typeof credentialStatuses)[number];

export const accessOutcomes = ['GRANTED', 'DENIED'] as const;
export type AccessOutcome = (typeof accessOutcomes)[number];

export const notificationStatuses = ['PENDING', 'SENT', 'FAILED', 'DEAD_LETTER', 'READ'] as const;
export type NotificationStatus = (typeof notificationStatuses)[number];
