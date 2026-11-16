import { createMyReportServices } from '@gymsheet/api-client';
import { apiClient } from '@/api/client';

/** The reporter's side of moderation: «Tus denuncias» and taking a report back. */
export const myReportsService = createMyReportServices(apiClient.request);

export const myReportsKey = ['moderation', 'my-reports'] as const;
