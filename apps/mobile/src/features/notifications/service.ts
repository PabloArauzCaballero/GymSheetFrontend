import { z } from 'zod';
import { apiClient } from '@/api/client';
import { notificationSchema, pageSchema } from '@gymsheet/schemas';

const notificationPageSchema = pageSchema(notificationSchema);
const unreadCountSchema = z.object({ count: z.number().int().nonnegative() });

export const notificationService = {
  list: (page: number) =>
    apiClient.request(
      `/notifications/me?page=${page}&pageSize=25`,
      notificationPageSchema,
      {
        method: 'GET',
      },
    ),
  markRead: (id: string) =>
    apiClient.request(`/notifications/${id}/read`, notificationSchema, {
      method: 'PATCH',
    }),
  unreadCount: () =>
    apiClient.request('/notifications/me/unread-count', unreadCountSchema, {
      method: 'GET',
    }),
};
