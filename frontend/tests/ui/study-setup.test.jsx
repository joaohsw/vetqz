import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudySetup from '../../src/components/StudySetup';

const baseTopics = [
  { id: 't1', title: 'Osteologia', summary: 'Ossos do esqueleto apendicular.', chunk_indices: [0, 1] },
];

describe('StudySetup question format selector', () => {
  it('renders all three question format options and notifies changes in pt-BR and es-CL', async () => {
    const user = userEvent.setup();
    const onQuestionModeChange = vi.fn();

    const { rerender } = render(
      <StudySetup
        topics={baseTopics}
        selectedTopicIds={['t1']}
        onSelectedTopicsChange={vi.fn()}
        questionCount={2}
        onQuestionCountChange={vi.fn()}
        maxQuestions={20}
        difficulty="medium"
        onDifficultyChange={vi.fn()}
        questionMode="descriptive"
        onQuestionModeChange={onQuestionModeChange}
        feedbackMode="immediate"
        onFeedbackModeChange={vi.fn()}
        onStart={vi.fn()}
        language="pt-BR"
      />,
    );

    const mcBtn = screen.getByRole('button', { name: /Apenas múltipla escolha/i });
    const descBtn = screen.getByRole('button', { name: /Apenas descritivas/i });
    const mixedBtn = screen.getByRole('button', { name: /Mistas \(as duas\)/i });

    expect(descBtn.getAttribute('aria-pressed')).toBe('true');
    expect(mcBtn.getAttribute('aria-pressed')).toBe('false');
    expect(mixedBtn.getAttribute('aria-pressed')).toBe('false');

    await user.click(mcBtn);
    expect(onQuestionModeChange).toHaveBeenCalledWith('multiple_choice');

    await user.click(mixedBtn);
    expect(onQuestionModeChange).toHaveBeenCalledWith('mixed');

    await user.click(descBtn);
    expect(onQuestionModeChange).toHaveBeenCalledWith('descriptive');

    rerender(
      <StudySetup
        topics={baseTopics}
        selectedTopicIds={['t1']}
        onSelectedTopicsChange={vi.fn()}
        questionCount={2}
        onQuestionCountChange={vi.fn()}
        maxQuestions={20}
        difficulty="medium"
        onDifficultyChange={vi.fn()}
        questionMode="mixed"
        onQuestionModeChange={onQuestionModeChange}
        feedbackMode="immediate"
        onFeedbackModeChange={vi.fn()}
        onStart={vi.fn()}
        language="es-CL"
      />,
    );

    expect(screen.getByRole('button', { name: /Solo opción múltiple/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Solo descriptivas/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Mixtas \(ambas\)/i }).getAttribute('aria-pressed')).toBe('true');
  });

  it('shows mixed single-question notice only when mixed mode has 1 question', () => {
    const { rerender } = render(
      <StudySetup
        topics={baseTopics}
        selectedTopicIds={['t1']}
        onSelectedTopicsChange={vi.fn()}
        questionCount={1}
        onQuestionCountChange={vi.fn()}
        maxQuestions={20}
        difficulty="medium"
        onDifficultyChange={vi.fn()}
        questionMode="mixed"
        onQuestionModeChange={vi.fn()}
        feedbackMode="immediate"
        onFeedbackModeChange={vi.fn()}
        onStart={vi.fn()}
        language="pt-BR"
      />,
    );

    expect(screen.getByText(/Com apenas 1 questão, a sessão sorteará um dos dois formatos/i)).toBeTruthy();

    rerender(
      <StudySetup
        topics={baseTopics}
        selectedTopicIds={['t1']}
        onSelectedTopicsChange={vi.fn()}
        questionCount={2}
        onQuestionCountChange={vi.fn()}
        maxQuestions={20}
        difficulty="medium"
        onDifficultyChange={vi.fn()}
        questionMode="mixed"
        onQuestionModeChange={vi.fn()}
        feedbackMode="immediate"
        onFeedbackModeChange={vi.fn()}
        onStart={vi.fn()}
        language="pt-BR"
      />,
    );

    expect(screen.queryByText(/Com apenas 1 questão, a sessão sorteará um dos dois formatos/i)).toBeNull();
  });
});
