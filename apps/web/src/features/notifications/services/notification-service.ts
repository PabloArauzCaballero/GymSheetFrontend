import { apiRequest } from '@/shared/api/api-client';
import type { Notification, NotificationPreference, Page } from '@/shared/api/contracts';
import { notificationPreferenceSchema, notificationSchema, pageSchema } from '@/shared/api/schemas';

export type NotificationPreferenceInput = {
  recordatoriosVencimiento: boolean;
  canalPreferido: 'IN_APP' | 'HTTP_GATEWAY';
  consentimientoExternoEn?: string | null;
  versionConsentimiento?: string | null;
  horaSilencioInicio?: string | null;
  horaSilencioFin?: string | null;
  metadata?: Record<string, unknown>;
};

export const notificationService = {
  list: (page = 1) =>
    apiRequest<Page<Notification>>(
      `/notifications/me?page=${page}&pageSize=25`,
      pageSchema(notificationSchema),
    ),
  markRead: (id: string) =>
    apiRequest<Notification>(`/notifications/${id}/read`, notificationSchema, { method: 'PATCH' }),
  getPreference: () =>
    apiRequest<NotificationPreference>(
      '/notifications/preferences/me',
      notificationPreferenceSchema,
    ),
  updatePreference: (input: NotificationPreferenceInput) =>
    apiRequest<NotificationPreference>(
      '/notifications/preferences/me',
      notificationPreferenceSchema,
      {
        method: 'PATCH',
        body: input,
      },
    ),
};
