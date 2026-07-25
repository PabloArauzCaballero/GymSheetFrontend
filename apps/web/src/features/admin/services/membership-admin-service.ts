import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
import type {
  Customer,
  Membership,
  MembershipPlan,
  MembershipStatus,
  Page,
  PlanScope,
  PlanType,
} from '@/shared/api/contracts';
import {
  customerSchema,
  membershipPlanSchema,
  membershipSchema,
  pageSchema,
} from '@/shared/api/schemas';

export type PlanInput = {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  tipo: PlanType;
  duracionDias: number;
  diasRecordatorio?: number[];
  alcances: PlanScope[];
  metadata?: Record<string, unknown>;
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
  createStaff: (input: {
    usuarioId: string;
    cargo: 'COACH' | 'FRONT_DESK' | 'ADMINISTRATION';
    contratadoEl: string;
    accesoIlimitado?: boolean;
    sedes: string[];
  }) =>
    apiRequest('/admin/membership/staff', z.record(z.string(), z.unknown()), {
      method: 'POST',
      body: input,
    }),
  updateStaffStatus: (
    userId: string,
    input: { estadoLaboral: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED'; terminadoEl?: string | null },
  ) =>
    apiRequest(`/admin/membership/staff/${userId}/status`, z.record(z.string(), z.unknown()), {
      method: 'PATCH',
      body: input,
    }),
};
