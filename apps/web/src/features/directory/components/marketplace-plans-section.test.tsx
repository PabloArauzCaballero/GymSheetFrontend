import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EntityPlan } from '@gymsheet/schemas';
import { MarketplacePlansSection } from './marketplace-plans-section';

describe('MarketplacePlansSection', () => {
  const mockPlan: EntityPlan = {
    id: '11111111-1111-4111-8111-111111111111',
    entityId: '22222222-2222-4222-8222-222222222222',
    type: 'MEMBERSHIP_PLAN',
    name: 'Plan Mensual Completo',
    slug: 'plan-mensual-completo',
    description: 'Acceso ilimitado a todas las áreas del gimnasio.',
    benefits: ['Área de pesas', 'Clases grupales', 'Vestuarios y lockers'],
    durationDays: 30,
    currentPrice: '45.00',
    currency: 'USD',
    status: 'ACTIVE',
    displayOrder: 1,
    mediaUrls: [],
    metadata: {},
  };

  it('no renderiza nada si no hay planes disponibles', () => {
    const { container } = render(<MarketplacePlansSection plans={[]} />);
    expect(container.firstChild).toBeNull();
  });

  // Franja 8d replaces the old QR modal (public bank data, receipt URL): the equivalent assertion
  // is that the card leads to the listing page, where the new checkout lives.
  it('muestra la tarjeta del plan con su precio y beneficios y lleva al checkout de la publicación', () => {
    render(<MarketplacePlansSection plans={[mockPlan]} />);

    expect(screen.getByText('Plan Mensual Completo')).toBeInTheDocument();
    expect(screen.getByText('45.00')).toBeInTheDocument();
    expect(screen.getByText('Área de pesas')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver y comprar Plan Mensual Completo' })).toHaveAttribute('href', `/publicacion/${mockPlan.id}`);
    expect(screen.queryByText('Banco Nacional')).not.toBeInTheDocument();
  });
});
