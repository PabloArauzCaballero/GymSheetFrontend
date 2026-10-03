import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Workout } from '@/shared/api/contracts';
import { DashboardTrainingSummary } from './dashboard-training-summary';

afterEach(() => vi.useRealTimers());

describe('DashboardTrainingSummary', () => {
  it('compara la carga de esta semana con la anterior', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T12:00:00'));
    const workouts = [
      { estado: 'FINALIZADA', fechaInicio: '2026-10-06T12:00:00', ejercicios: [{ series: [{ pesoKg: 20, repeticiones: 10 }] }] },
      { estado: 'FINALIZADA', fechaInicio: '2026-09-29T12:00:00', ejercicios: [{ series: [{ pesoKg: 10, repeticiones: 10 }] }] },
    ] as Workout[];
    render(<DashboardTrainingSummary workouts={workouts} />);
    expect(screen.getByText('200 kg')).toBeInTheDocument();
    expect(screen.getByText(/\+100 % frente a la anterior/u)).toBeInTheDocument();
    expect(screen.getByText('Carga esta semana')).toBeInTheDocument();
  });
});
