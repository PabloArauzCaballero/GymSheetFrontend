import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { SOCIAL_BIO_MAX } from '@/shared/api/schemas';
import { BioField } from './bio-field';

function Harness({ initial = '' }: Readonly<{ initial?: string }>) {
  const [value, setValue] = useState(initial);
  return <BioField onChange={setValue} value={value} />;
}

describe('BioField', () => {
  it('counts characters as you type', () => {
    render(<Harness />);
    expect(screen.getByText(`0/${SOCIAL_BIO_MAX}`)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tu bio'), { target: { value: 'Hola' } });
    expect(screen.getByText(`4/${SOCIAL_BIO_MAX}`)).toBeInTheDocument();
  });

  it('never goes past the 500-character limit', () => {
    render(<Harness />);
    const bio = screen.getByLabelText('Tu bio');
    expect(bio).toHaveAttribute('maxLength', String(SOCIAL_BIO_MAX));
    fireEvent.change(bio, { target: { value: 'a'.repeat(SOCIAL_BIO_MAX + 40) } });
    expect(bio).toHaveValue('a'.repeat(SOCIAL_BIO_MAX));
    expect(screen.getByText(`${SOCIAL_BIO_MAX}/${SOCIAL_BIO_MAX}`)).toBeInTheDocument();
  });
});
