import { createBusinessServices } from '@gymsheet/api-client';
import { apiRequest } from '@/shared/api/api-client';

// Signup and the legal set go through their own BFF routes, with the rest of the auth calls.
export { fetchBusinessLegal, signupBusiness } from '@/features/auth/services/auth-client';

/** Business account calls through the generic BFF proxy (same services as the mobile). */
export const businessService = createBusinessServices(apiRequest);
