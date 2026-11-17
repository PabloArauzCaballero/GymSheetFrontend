import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { InterestsPicker } from './interests-picker';

const catalog = ['Correr', 'Yoga', 'Cine', 'Viajar', 'Cocinar', 'Música'].map((label, index) => ({
  code: `I${index}`,
  label,
}));

function Harness() {
  const [selected, setSelected] = useState<string[]>([]);
  return <InterestsPicker catalog={catalog} onChange={setSelected} selected={selected} />;
}

describe('InterestsPicker', () => {
  it('allows five interests, then disables the rest until one is removed', () => {
    render(<Harness />);
    for (const label of ['Correr', 'Yoga', 'Cine', 'Viajar', 'Cocinar']) {
      fireEvent.click(screen.getByRole('button', { name: label }));
    }
    expect(screen.getByText('5/5')).toBeInTheDocument();
    const sixth = screen.getByRole('button', { name: 'Música' });
    expect(sixth).toBeDisabled();
    fireEvent.click(sixth);
    expect(sixth).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Yoga' }));
    expect(screen.getByText('4/5')).toBeInTheDocument();
    expect(sixth).toBeEnabled();
  });
});
