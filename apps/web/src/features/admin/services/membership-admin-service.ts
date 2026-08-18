import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
import type {
  Customer,
  EmploymentStatus,
  Membership,
  MembershipPlan,
  MembershipStatus,
  Page,
  PlanScope,
  PlanType,
  StaffPosition,
  StaffProfile,
} from '@/shared/api/contracts';
import {
  customerSchema,
  membershipPlanSchema,
  membershipSchema,
  pageSchema,
  staffProfileSchema,
} from '@/shared/api/schemas';

/**
 * Atributos comerciales del plan. Se envían solo si el formulario los define:
 * omitir una clave en un PATCH deja el valor actual intacto, mientras que
 * enviarla como `null` la borra deliberadamente.
 */
export type PlanCommercialInput = {
  precio?: number | null;
  moneda?: string | null;
  beneficios?: string[];
  orden?: number;
  disponibleNuevo?: boolean;
  disponibleRenovacion?: boolean;
  disponibleExtension?: boolean;
  /** Archivo de medios que ilustra el plan; es donde vive su QR de cobro. */
  imagenId?: string | null;
};

export type PlanInput = PlanCommercialInput & {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  tipo: PlanType;
  duracionDias: number;
  diasRecordatorio?: number[];
  alcances: PlanScope[];
  metadata?: Record<string, unknown>;
};

export type StaffUserInput = {
  email: string;
  password: string;
  nombreCompleto: string;
  cargo: StaffPosition;
  contratadoEl: string;
  accesoIlimitado?: boolean;
  sedes: string[];
  pinAcceso?: string | null;
};

export type CustomerInput = {
  email: string;
  password: string;
  pinAcceso: string;
  nombreCompleto: string;
  numeroCliente: string;
  telefono?: string | null;
  referenciaExterna?: string | null;
  notas?: string | null;
  metadata?: Record<string, unknown>;
};

export const membershipAdminService = {
  listPlans: () =>
    apiRequest<MembershipPlan[]>('/admin/membership/plans', z.array(membershipPlanSchema)),
  createPlan: (input: PlanInput) =>
    apiRequest<MembershipPlan>('/admin/membership/plans', membershipPlanSchema, {
      method: 'POST',
      body: input,
    }),
  updatePlan: (
    id: string,
    input: Partial<Omit<PlanInput, 'codigo' | 'alcances'>> & { estado?: 'ACTIVE' | 'INACTIVE' },
  ) =>
    apiRequest<MembershipPlan>(`/admin/membership/plans/${id}`, membershipPlanSchema, {
      method: 'PATCH',
      body: input,
    }),
  replaceScopes: (id: string, alcances: PlanScope[]) =>
    apiRequest<MembershipPlan>(`/admin/membership/plans/${id}/scopes`, membershipPlanSchema, {
      method: 'PATCH',
      body: { alcances },
    }),
  listCustomers: (page = 1) =>
    apiRequest<Page<Customer>>(
      `/admin/membership/customers?page=${page}&pageSize=25`,
      pageSchema(customerSchema),
    ),
  createCustomer: (input: CustomerInput) =>
    apiRequest<Customer>('/admin/membership/customers', customerSchema, {
      method: 'POST',
      body: input,
    }),
  listMemberships: (page = 1, estado?: MembershipStatus) =>
    apiRequest<Page<Membership>>(
      `/admin/membership/memberships?page=${page}&pageSize=25${estado ? `&estado=${estado}` : ''}`,
      pageSchema(membershipSchema),
    ),
  createMembership: (input: {
    clienteUsuarioId: string;
    planId: string;
    iniciaEl?: string;
    referenciaExterna?: string | null;
    notas?: string | null;
  }) =>
    apiRequest<Membership>('/admin/membership/memberships', membershipSchema, {
      method: 'POST',
      body: input,
    }),
  changeStatus: (id: string, estado: MembershipStatus, motivo?: string | null) =>
    apiRequest<Membership>(`/admin/membership/memberships/${id}/status`, membershipSchema, {
      method: 'PATCH',
      body: { estado, motivo },
    }),
  /** Vincula un perfil laboral a una cuenta que ya existe. */
  createStaff: (input: {
    usuarioId: string;
    cargo: StaffPosition;
    contratadoEl: string;
    accesoIlimitado?: boolean;
    sedes: string[];
  }) =>
    apiRequest<StaffProfile>('/admin/membership/staff', staffProfileSchema, {
      method: 'POST',
      body: input,
    }),
  /** Alta completa: crea la cuenta con su rol y el perfil laboral en un paso. */
  createStaffUser: (input: StaffUserInput) =>
    apiRequest<StaffProfile>('/admin/membership/staff-users', staffProfileSchema, {
      method: 'POST',
      body: input,
    }),
  listStaff: (page = 1, cargo?: StaffPosition) =>
    apiRequest<Page<StaffProfile>>(
      `/admin/membership/staff?page=${page}&pageSize=25${cargo ? `&cargo=${cargo}` : ''}`,
      pageSchema(staffProfileSchema),
    ),
  updateStaffStatus: (
    userId: string,
    input: { estadoLaboral: EmploymentStatus; terminadoEl?: string | null },
  ) =>
    apiRequest<StaffProfile>(`/admin/membership/staff/${userId}/status`, staffProfileSchema, {
      method: 'PATCH',
      body: input,
    }),
};
