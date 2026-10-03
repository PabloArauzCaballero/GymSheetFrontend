import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExerciseZoneFilter } from './exercise-zone-filter';

const taxonomy = [
  {
    bodyPart: 'upper legs', total: 12, imageUrl: null,
    muscles: [
      { targetMuscle: 'quadriceps', total: 8, imageUrl: null },
      { targetMuscle: 'hamstrings', total: 4, imageUrl: null },
    ],
  },
];

describe('ExerciseZoneFilter', () => {
  it('permite elegir una zona y luego un músculo de esa zona', () => {
    const onBodyPart = vi.fn();
    const onMuscle = vi.fn();
    const props = { taxonomy, onBodyPart, onMuscle };
    const { rerender } = render(<ExerciseZoneFilter {...props} bodyPart={null} muscle={null} />);
    fireEvent.click(screen.getByRole('button', { name: /Upper legs/ }));
    expect(onBodyPart).toHaveBeenCalledWith('upper legs');
    rerender(<ExerciseZoneFilter {...props} bodyPart="upper legs" muscle={null} />);
    fireEvent.click(screen.getByRole('button', { name: /Quadriceps/ }));
    expect(onMuscle).toHaveBeenCalledWith('quadriceps');
    rerender(<ExerciseZoneFilter {...props} bodyPart="upper legs" muscle="quadriceps" />);
    expect(screen.getByRole('button', { name: /Quadriceps/ })).toHaveAttribute('aria-pressed', 'true');
  });
});
