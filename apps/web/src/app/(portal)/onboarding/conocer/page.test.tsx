import { afterEach, describe, expect, it, vi } from 'vitest';
import ConocerOnboardingPage from './page';

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  redirect: vi.fn((to: string) => {
    throw new Error(`redirect:${to}`);
  }),
}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/shared/server/session', () => ({ requireSession: mocks.requireSession }));
vi.mock('@/features/onboarding/components/conocer/conocer-flow', () => ({ ConocerFlow: () => null }));

afterEach(() => vi.clearAllMocks());

describe('/onboarding/conocer', () => {
  it('renders the flow for a member', async () => {
    mocks.requireSession.mockResolvedValue({ role: 'CLIENTE' });
    await expect(ConocerOnboardingPage()).resolves.toBeTruthy();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('sends platform roles to their console and legacy gym roles to the person portal', async () => {
    // Franja 7a: the gym has no staff console any more.
    mocks.requireSession.mockResolvedValue({ role: 'FRONT_DESK' });
    await expect(ConocerOnboardingPage()).rejects.toThrow('redirect:/comunidad');
    mocks.requireSession.mockResolvedValue({ role: 'SYSTEM_ADMIN' });
    await expect(ConocerOnboardingPage()).rejects.toThrow('redirect:/sistema');
    mocks.requireSession.mockResolvedValue({ role: 'COACH' });
    await expect(ConocerOnboardingPage()).rejects.toThrow('redirect:/comunidad');
  });
});
