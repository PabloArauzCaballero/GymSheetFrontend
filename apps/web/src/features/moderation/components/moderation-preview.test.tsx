import type { ModerationCaseContent } from '@gymsheet/schemas';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { moderationCaseDetailSchema } from '@/features/moderation/services/moderation-service';
import { ContentPreview } from './moderation-preview';

const routine: ModerationCaseContent = {
  kind: 'ROUTINE',
  name: 'Empuje peligroso',
  description: 'Privada de otra persona',
  visibility: 'PRIVATE',
  days: [
    {
      name: 'Empuje',
      weekday: 1,
      exercises: [{ name: 'Press banca', sets: 4, repsMin: 8, repsMax: 10, weightKg: 60, durationSeconds: null }],
    },
    { name: null, weekday: 4, exercises: [{ name: 'Fondos', sets: 3, repsMin: null, repsMax: null, weightKg: null, durationSeconds: null }] },
  ],
  reach: { copies: 4, liveCopies: 3, activations: 2 },
};

describe('ContentPreview', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows a reported marketplace listing with its seller, price and terms (franja 8c)', () => {
    render(
      <ContentPreview
        content={{
          kind: 'BUSINESS_LISTING',
          name: 'Pack 10 clases',
          description: 'Funcional o spinning.',
          benefits: ['Toalla'],
          offerKind: 'CLASS_PACK',
          price: '300.00',
          currency: 'BOB',
          validityDays: 60,
          sessionsCount: 10,
          mediaUrls: [],
          status: 'ACTIVE',
          moderationStatus: 'LIVE',
          seller: { entityId: '4e0b2a6c-1f3d-4b8a-9c2e-7d6f5a4b3c21', name: 'Top Fitness', handle: 'topfit' },
        }}
        contentUnavailableReason={null}
      />,
    );
    const preview = screen.getByTestId('vista-previa');
    expect(preview).toHaveTextContent('Paquete de clases · Top Fitness (@topfit)');
    expect(preview).toHaveTextContent('10 sesiones · vence a los 60 días');
    expect(preview).toHaveTextContent('Toalla');
  });

  it('shows the routine from the case file, days, sets and reach, without any other request', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<ContentPreview content={routine} contentUnavailableReason={null} />);
    const preview = screen.getByTestId('vista-previa');
    expect(preview).toHaveTextContent('Empuje peligroso');
    expect(preview).toHaveTextContent('2 días · 2 ejercicios');
    expect(preview).toHaveTextContent('Press banca · 4 series · 8–10 reps · 60 kg');
    expect(preview).toHaveTextContent('Día 2 · jueves');
    expect(screen.getByTestId('alcance')).toHaveTextContent('3 con una copia activa');
    expect(screen.getByTestId('alcance')).toHaveTextContent('4 copias en total');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('shows the exercise with its muscle groups, steps and media', () => {
    render(
      <ContentPreview
        content={{
          kind: 'EXERCISE',
          name: 'Remo privado',
          description: null,
          muscleGroups: ['back'],
          instructions: ['Tira', 'Suelta'],
          media: [{ type: 'IMAGE', url: 'https://cdn.test/a.png' }],
        }}
        contentUnavailableReason={null}
      />,
    );
    const preview = screen.getByTestId('vista-previa');
    expect(preview).toHaveTextContent('Remo privado');
    expect(preview).toHaveTextContent('1 archivo de medios');
    expect(screen.getByRole('link', { name: 'Ver imagen 1' })).toHaveAttribute('href', 'https://cdn.test/a.png');
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Tira', 'Suelta', 'Ver imagen 1']);
  });

  it('shows the comment text itself', () => {
    render(
      <ContentPreview
        content={{ kind: 'COMMENT', text: 'Esto es un fraude', attachmentUrl: null, attachmentType: null, deletedByAuthor: true }}
        contentUnavailableReason={null}
      />,
    );
    expect(screen.getByTestId('vista-previa')).toHaveTextContent('Esto es un fraude');
    expect(screen.getByText('Su autor lo borró después de la denuncia.')).toBeInTheDocument();
  });

  it('never renders a member-supplied link with a non-http scheme', () => {
    const { container, rerender } = render(
      <ContentPreview
        content={{ kind: 'MUSIC_PLAYLIST', name: 'Lista peligrosa', url: 'javascript:alert(1)', type: 'SPOTIFY', imageUrl: null } as ModerationCaseContent}
        contentUnavailableReason={null}
      />,
    );
    expect(screen.getByText('Lista peligrosa')).toBeTruthy();
    expect(container.querySelector('a')).toBeNull();
    rerender(
      <ContentPreview
        content={{ kind: 'COMMENT', text: 'hola', attachmentUrl: 'data:text/html,<b>x</b>', attachmentType: 'FILE', deletedByAuthor: false } as ModerationCaseContent}
        contentUnavailableReason={null}
      />,
    );
    expect(container.querySelector('a')).toBeNull();
    expect(screen.getByText(/no seguro/u)).toBeTruthy();
  });

  it('says an erased target is gone, and leaves a chat message to its evidence', () => {
    const { rerender } = render(<ContentPreview content={null} contentUnavailableReason="ERASED" />);
    expect(screen.getByTestId('vista-previa')).toHaveTextContent('Este contenido ya se eliminó');
    rerender(<ContentPreview content={null} contentUnavailableReason="CHAT_EVIDENCE" />);
    expect(screen.queryByTestId('vista-previa')).toBeNull();
  });
});

describe('moderationCaseDetailSchema content', () => {
  const base = {
    targetKind: 'ROUTINE',
    targetId: '22222222-2222-4222-8222-222222222222',
    reportedUser: { id: '33333333-3333-4333-8333-333333333333', name: 'Ana', suspendedUntil: null },
    reports: [],
    activeStrikes: 0,
    pendingSanction: { kind: 'ADVERTENCIA', days: null },
    contentHidden: true,
  };

  it('reads the snapshot of the case file', () => {
    const parsed = moderationCaseDetailSchema.parse({ ...base, content: routine, contentUnavailableReason: null });
    expect(parsed.content).toEqual(routine);
  });

  it('rejects a malformed snapshot and defaults a missing one to null', () => {
    expect(moderationCaseDetailSchema.safeParse({ ...base, content: { kind: 'ROUTINE', name: 'x' } }).success).toBe(false);
    expect(moderationCaseDetailSchema.parse(base)).toMatchObject({ content: null, contentUnavailableReason: null });
  });
});
