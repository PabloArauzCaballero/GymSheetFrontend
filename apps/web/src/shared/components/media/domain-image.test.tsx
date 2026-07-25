import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DomainImage } from './domain-image';

describe('DomainImage', () => {
  it('shows an accessible fallback when the source fails', () => {
    const view = render(<DomainImage alt="Press de banca" src="https://example.test/broken.jpg" />);
    fireEvent.error(view.getByRole('img', { name: 'Press de banca' }));
    expect(
      view.getByRole('img', { name: 'Press de banca: imagen no disponible' }),
    ).toBeInTheDocument();
  });
});
