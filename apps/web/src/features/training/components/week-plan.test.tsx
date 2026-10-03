import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RoutineAssignment } from '@/shared/api/contracts';
import { WeekPlan } from './week-plan';

describe('WeekPlan', () => {
  it('muestra la rutina el lunes y el descanso el martes', () => {
    const onPickRoutine = vi.fn();
    const assignments = [{
      id: 'a1', estado: 'ACTIVE', diasSemana: [1], rutina: { id: 'r1', nombre: 'Fuerza' },
    }] as RoutineAssignment[];
    render(<WeekPlan assignments={assignments} onPickRoutine={onPickRoutine} />);
    fireEvent.click(screen.getByRole('button', { name: /lunes: Fuerza/ }));
    expect(onPickRoutine).toHaveBeenCalledWith('r1');
    expect(screen.getByRole('button', { name: /martes: descanso/ })).toBeDisabled();
  });
});
