import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('announces the title and supporting description', () => {
    const view = within(
      render(<EmptyState title="Sin entrenamientos" description="Inicia tu primera sesión." />)
        .container,
    );
    expect(view.getByRole('heading', { name: 'Sin entrenamientos' })).toBeInTheDocument();
    expect(view.getByText('Inicia tu primera sesión.')).toBeInTheDocument();
  });
});
