import { createMyReportServices } from '@gymsheet/api-client';
import { apiRequest } from '@/shared/api/api-client';

/** The reporter's side of moderation: «Tus denuncias» and taking a report back. */
export const myReportsService = createMyReportServices(apiRequest);

export const myReportsKey = ['moderation', 'my-reports'] as const;
