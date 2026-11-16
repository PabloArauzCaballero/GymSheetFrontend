import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrivacyDisclosure } from '@/features/privacy/components/privacy-disclosure';
import { ACCOUNT_EXPORT_SECTION_ID } from '@/shared/lib/account-links';
import { NoticeAction } from './notice-action';

describe('NoticeAction', () => {
  it('links a ready export notice to the export card in Ajustes', () => {
    render(<NoticeAction notice={{ tipo: 'ACCOUNT_EXPORT_READY' }} />);
    expect(screen.getByRole('link', { name: 'Ir a descargar mi copia' })).toHaveAttribute(
      'href',
      '/settings#descargar-mis-datos',
    );
  });

  it('links a failed export notice to ask again, and leaves plain notices alone', () => {
    const { rerender } = render(<NoticeAction notice={{ tipo: 'ACCOUNT_EXPORT_FAILED' }} />);
    expect(screen.getByRole('link', { name: 'Pedir otra copia' })).toHaveAttribute('href', '/settings#descargar-mis-datos');
    rerender(<NoticeAction notice={{ tipo: 'SANCTION' }} />);
    expect(screen.queryByRole('link')).toBeNull();
    rerender(<NoticeAction notice={{ tipo: null }} />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('PrivacyDisclosure targeted by a notice', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('opens the export card when the URL points to it', () => {
    window.history.replaceState(null, '', `/settings#${ACCOUNT_EXPORT_SECTION_ID}`);
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const { container } = render(
      <PrivacyDisclosure id={ACCOUNT_EXPORT_SECTION_ID} title="Descargar mis datos">
        <p>Copia</p>
      </PrivacyDisclosure>,
    );
    expect(container.querySelector('details')).toHaveAttribute('open');
    expect(scroll).toHaveBeenCalled();
  });

  it('stays closed otherwise', () => {
    const { container } = render(
      <PrivacyDisclosure id={ACCOUNT_EXPORT_SECTION_ID} title="Descargar mis datos">
        <p>Copia</p>
      </PrivacyDisclosure>,
    );
    expect(container.querySelector('details')).not.toHaveAttribute('open');
  });
});
