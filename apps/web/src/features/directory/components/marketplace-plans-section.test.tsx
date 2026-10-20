import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EntityPaymentConfig, EntityPlan } from '@gymsheet/schemas';
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

  const mockPaymentConfig: EntityPaymentConfig = {
    bankName: 'Banco Nacional',
    accountHolderName: 'Gimnasio Central SRL',
    taxId: '1029384756',
    accountNumber: '1234-5678-9012',
    aliasOrPhone: 'gimnasio.central',
    qrImageUrl: 'https://cdn.gymsheet.com/qr/sample.png',
    instructions: 'Envía tu comprobante con el número de orden.',
    isActive: true,
  };

  it('no renderiza nada si no hay planes disponibles', () => {
    const { container } = render(
      <MarketplacePlansSection
        plans={[]}
        paymentConfig={mockPaymentConfig}
        entityId="22222222-2222-4222-8222-222222222222"
        entityName="Gimnasio Central"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('muestra la tarjeta del plan con su precio, beneficios y abre el modal al hacer clic en adquirir', () => {
    render(
      <MarketplacePlansSection
        plans={[mockPlan]}
        paymentConfig={mockPaymentConfig}
        entityId="22222222-2222-4222-8222-222222222222"
        entityName="Gimnasio Central"
      />
    );

    expect(screen.getByText('Plan Mensual Completo')).toBeInTheDocument();
    expect(screen.getByText('45.00')).toBeInTheDocument();
    expect(screen.getByText('Área de pesas')).toBeInTheDocument();

    const buyBtn = screen.getByRole('button', { name: /Adquirir \/ Pagar con QR/i });
    expect(buyBtn).toBeInTheDocument();

    fireEvent.click(buyBtn);

    // Modal se abre
    expect(screen.getByText('Banco Nacional')).toBeInTheDocument();
    expect(screen.getByText('Gimnasio Central SRL')).toBeInTheDocument();
    expect(screen.getByText('1234-5678-9012')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continuar y Subir Comprobante/i })).toBeInTheDocument();
  });
});
