import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FormWizard, textOf, WizardSummary, type WizardStep } from './form-wizard';

const steps: WizardStep[] = [
  {
    id: 'one',
    title: 'Identidad',
    render: () => <input aria-label="Nombre" name="nombre" required />,
  },
  {
    id: 'two',
    title: 'Detalle',
    validate: (values) => (textOf(values, 'codigo') === 'MAL' ? 'Código no permitido.' : null),
    render: () => <input aria-label="Código" name="codigo" />,
  },
  {
    id: 'three',
    title: 'Revisión',
    render: (values) => (
      <WizardSummary items={[{ label: 'Resumen nombre', value: textOf(values, 'nombre') }]} />
    ),
  },
];

function next() {
  fireEvent.click(screen.getByRole('button', { name: /Siguiente/u }));
}

describe('FormWizard', () => {
  it('does not advance while a required field of the step is empty', () => {
    render(<FormWizard onSubmit={vi.fn()} steps={steps} />);
    next();
    expect(screen.getByText(/Paso 1 de 3/u)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Paso 1: Identidad' })).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  it('runs the custom step validation and shows its message', () => {
    render(<FormWizard onSubmit={vi.fn()} steps={steps} />);
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Sede Norte' } });
    next();
    fireEvent.change(screen.getByLabelText('Código'), { target: { value: 'MAL' } });
    next();
    expect(screen.getByRole('alert')).toHaveTextContent('Código no permitido.');
    expect(screen.getByText(/Paso 2 de 3/u)).toBeInTheDocument();
  });

  it('keeps values across steps, summarises them and submits everything', () => {
    const onSubmit = vi.fn();
    render(<FormWizard onSubmit={onSubmit} steps={steps} submitLabel="Registrar" />);
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Sede Norte' } });
    next();
    fireEvent.click(screen.getByRole('button', { name: /Atrás/u }));
    expect(screen.getByLabelText('Nombre')).toHaveValue('Sede Norte');
    next();
    fireEvent.change(screen.getByLabelText('Código'), { target: { value: 'NORTE' } });
    next();
    expect(screen.getByText('Sede Norte')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const values = onSubmit.mock.calls[0]![0] as FormData;
    expect(values.get('nombre')).toBe('Sede Norte');
    expect(values.get('codigo')).toBe('NORTE');
  });

  it('only lets the step indicator jump forward through valid steps', () => {
    render(<FormWizard onSubmit={vi.fn()} steps={steps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Paso 2: Detalle' }));
    expect(screen.getByText(/Paso 1 de 3/u)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Paso 3: Revisión' })).toBeDisabled();
  });

  it('offers cancel on the first step', () => {
    const onCancel = vi.fn();
    render(<FormWizard onCancel={onCancel} onSubmit={vi.fn()} steps={steps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
