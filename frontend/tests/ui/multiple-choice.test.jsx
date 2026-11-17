import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../../src/pages/Home';
import Layout from '../../src/components/Layout';
import * as api from '../../src/lib/api';

vi.mock('../../src/lib/api', () => ({
  analyzeTopics: vi.fn(),
  completeStudySession: vi.fn(),
  createStudySession: vi.fn(),
  deleteDocument: vi.fn(),
  listMaterials: vi.fn(),
  listStudyHistory: vi.fn(),
  getStudySession: vi.fn(),
  evaluateAnswer: vi.fn(),
  generateQuestion: vi.fn(),
  restoreTopics: vi.fn(),
  uploadPdf: vi.fn(),
}));

const sampleMcOptions = [
  { id: 'A', text: 'Úmero', rationale: 'O úmero pertence ao membro torácico.' },
  { id: 'B', text: 'Fêmur', rationale: null },
  { id: 'C', text: 'Escápula', rationale: 'A escápula fica no membro torácico.' },
  { id: 'D', text: 'Tíbia', rationale: 'A tíbia articula-se distalmente ao fêmur.' },
];

beforeEach(() => {
  vi.resetAllMocks();
  api.restoreTopics.mockResolvedValue({
    topics: [{ id: 'bones', title: 'Osteologia', summary: 'Ossos e articulações.', chunk_indices: [0, 1] }],
    is_veterinary: true,
  });
  api.createStudySession.mockResolvedValue({ id: 'session-1' });
  api.completeStudySession.mockResolvedValue(undefined);
  api.listMaterials.mockResolvedValue([]);
  api.listStudyHistory.mockResolvedValue([]);
});

const nav = (number) => screen.getByRole('button', { name: new RegExp(`^Pergunta ${number} —`) });

describe('multiple choice and mixed question flows', () => {
  it('runs a multiple-choice-only session, preserves draft selection across navigation, and supports retry', async () => {
    const user = userEvent.setup();
    let seq = 0;
    api.generateQuestion.mockImplementation(async () => {
      seq += 1;
      return {
        question: `Questão MC ${seq}`,
        reference_answer: 'O fêmur articula-se com o acetábulo.',
        question_type: 'multiple_choice',
        options: sampleMcOptions,
        correct_option_id: 'B',
        chunk_used: 'Trecho do fêmur.',
        chunk_index: 0,
      };
    });
    api.evaluateAnswer
      .mockResolvedValueOnce({
        attempt_id: 'att-1',
        score: 0,
        feedback: 'Resposta incorreta. Você selecionou a alternativa A (Úmero). O úmero pertence ao membro torácico.',
        model_answer: 'B) Fêmur\n\nO fêmur articula-se com o acetábulo.',
        question_type: 'multiple_choice',
        options: sampleMcOptions,
        correct_option_id: 'B',
        selected_option_id: 'A',
      })
      .mockResolvedValueOnce({
        attempt_id: 'att-1',
        score: 10,
        feedback: 'Resposta correta! Você selecionou a alternativa B (Fêmur).',
        model_answer: 'B) Fêmur\n\nO fêmur articula-se com o acetábulo.',
        question_type: 'multiple_choice',
        options: sampleMcOptions,
        correct_option_id: 'B',
        selected_option_id: 'B',
      })
      .mockResolvedValueOnce({
        attempt_id: 'att-2',
        score: 10,
        feedback: 'Resposta correta! Você selecionou a alternativa B (Fêmur).',
        model_answer: 'B) Fêmur\n\nO fêmur articula-se com o acetábulo.',
        question_type: 'multiple_choice',
        options: sampleMcOptions,
        correct_option_id: 'B',
        selected_option_id: 'B',
      });
    api.getStudySession.mockResolvedValue({
      id: 'session-1',
      average_score: 10,
      answered_question_count: 2,
      question_mode: 'multiple_choice',
      attempts: [
        {
          id: 'att-1',
          question_position: 1,
          question: 'Questão MC 1',
          topic_title: 'Osteologia',
          score: 10,
          feedback: 'Resposta correta!',
          model_answer: 'B) Fêmur\n\nO fêmur articula-se com o acetábulo.',
          question_type: 'multiple_choice',
          options: sampleMcOptions,
          correct_option_id: 'B',
          selected_option_id: 'B',
        },
        {
          id: 'att-2',
          question_position: 2,
          question: 'Questão MC 2',
          topic_title: 'Osteologia',
          score: 10,
          feedback: 'Resposta correta!',
          model_answer: 'B) Fêmur\n\nO fêmur articula-se com o acetábulo.',
          question_type: 'multiple_choice',
          options: sampleMcOptions,
          correct_option_id: 'B',
          selected_option_id: 'B',
        },
      ],
    });

    const { container } = render(
      <Home language="pt-BR" resumeRequest={{ documentId: 'doc-1', plannedQuestionCount: 2 }} />,
    );

    await screen.findByRole('button', { name: /Apenas múltipla escolha/i });
    await user.click(screen.getByRole('button', { name: /Apenas múltipla escolha/i }));
    await user.click(container.querySelector('#start-study-session-btn'));

    await screen.findByText('Questão MC 1');
    expect(api.createStudySession).toHaveBeenCalledWith(expect.objectContaining({
      questionMode: 'multiple_choice',
    }));
    expect(api.generateQuestion).toHaveBeenCalledWith('doc-1', expect.objectContaining({
      questionType: 'multiple_choice',
    }));
    expect(container.querySelector('textarea')).toBeNull();

    const submitBtn = container.querySelector('#submit-mc-answer-btn');
    expect(submitBtn.disabled).toBe(true);

    // Select option A and verify draft survives switching to Q2 and back
    await user.click(screen.getByRole('radio', { name: /Úmero/i }));
    expect(submitBtn.disabled).toBe(false);

    await user.click(nav(2));
    await screen.findByText('Questão MC 2');
    await user.click(nav(1));
    await screen.findByText('Questão MC 1');
    expect(screen.getByRole('radio', { name: /Úmero/i }).checked).toBe(true);

    // Submit wrong option A
    await user.click(container.querySelector('#submit-mc-answer-btn'));
    await screen.findByText('0.0');
    expect(screen.getByText('Sua escolha')).toBeTruthy();
    expect(screen.getByText('Correta')).toBeTruthy();
    expect(api.evaluateAnswer).toHaveBeenCalledWith(expect.objectContaining({
      questionType: 'multiple_choice',
      selectedOptionId: 'A',
      correctOptionId: 'B',
      options: sampleMcOptions,
    }));

    // Retry and pick B
    await user.click(container.querySelector('#recommended-action-btn'));
    await screen.findByRole('radio', { name: /Fêmur/i });
    await user.click(screen.getByRole('radio', { name: /Fêmur/i }));
    await user.click(container.querySelector('#submit-mc-answer-btn'));
    await screen.findByText('10.0');
    expect(api.evaluateAnswer.mock.calls[1][0].retryAttemptId).toBe('att-1');

    // Continue to Q2 and finish
    await user.click(container.querySelector('#recommended-action-btn'));
    await screen.findByText('Questão MC 2');
    await user.click(screen.getByRole('radio', { name: /Fêmur/i }));
    await user.click(container.querySelector('#submit-mc-answer-btn'));
    await screen.findByText('10.0');
    await user.click(container.querySelector('#finish-session-btn'));

    await waitFor(() => expect(container.querySelector('#new-session-btn')).not.toBeNull());
    expect(screen.getByText('10,0')).toBeTruthy();
  });

  it('runs a mixed session generating both multiple-choice and descriptive questions', async () => {
    const user = userEvent.setup();
    let mcSeq = 0;
    let descSeq = 0;

    api.generateQuestion.mockImplementation(async (_, { questionType }) => {
      if (questionType === 'multiple_choice') {
        mcSeq += 1;
        return {
          question: `Pergunta MC ${mcSeq}`,
          reference_answer: 'Explicação MC.',
          question_type: 'multiple_choice',
          options: sampleMcOptions,
          correct_option_id: 'B',
          chunk_used: 'Trecho MC.',
          chunk_index: 0,
        };
      }
      descSeq += 1;
      return {
        question: `Pergunta Descritiva ${descSeq}`,
        reference_answer: 'Resposta descritiva.',
        question_type: 'descriptive',
        options: [],
        correct_option_id: null,
        chunk_used: 'Trecho Descritivo.',
        chunk_index: 1,
      };
    });

    api.evaluateAnswer.mockImplementation(async ({ questionType, questionPosition }) => ({
      attempt_id: `att-${questionPosition}`,
      score: questionType === 'multiple_choice' ? 10 : 8,
      feedback: questionType === 'multiple_choice' ? 'Correta!' : 'Boa explicação.',
      model_answer: 'Modelo',
      question_type: questionType,
    }));

    const { container } = render(
      <Home language="pt-BR" resumeRequest={{ documentId: 'doc-1', plannedQuestionCount: 4 }} />,
    );

    await screen.findByRole('button', { name: /Mistas \(as duas\)/i });
    await user.click(screen.getByRole('button', { name: /Mistas \(as duas\)/i }));
    await user.click(container.querySelector('#start-study-session-btn'));

    await waitFor(() => expect(api.createStudySession).toHaveBeenCalledWith(expect.objectContaining({
      questionMode: 'mixed',
      plannedQuestionCount: 4,
    })));

    // Visit all 4 questions to ensure both types are requested evenly (2 MC + 2 descriptive)
    for (let position = 1; position <= 4; position += 1) {
      if (position > 1) {
        await user.click(nav(position));
      }
      await waitFor(() => expect(api.generateQuestion).toHaveBeenCalledTimes(position));
      const requestedType = api.generateQuestion.mock.calls[position - 1][1].questionType;
      if (requestedType === 'multiple_choice') {
        expect(screen.getByRole('radiogroup')).toBeTruthy();
        expect(container.querySelector('textarea')).toBeNull();
        await user.click(screen.getByRole('radio', { name: /Fêmur/i }));
        await user.click(container.querySelector('#submit-mc-answer-btn'));
      } else {
        expect(container.querySelector('textarea')).not.toBeNull();
        expect(screen.queryByRole('radiogroup')).toBeNull();
        await user.type(container.querySelector('textarea'), 'Explicação anatômica');
        await user.click(container.querySelector('#submit-audio-answer-btn'));
      }
      await waitFor(() => expect(api.evaluateAnswer).toHaveBeenCalledTimes(position));
    }

    const generatedTypes = api.generateQuestion.mock.calls.map(([, args]) => args.questionType);
    expect(generatedTypes.filter((t) => t === 'multiple_choice')).toHaveLength(2);
    expect(generatedTypes.filter((t) => t === 'descriptive')).toHaveLength(2);
  });

  it('hides correct option indicators when revisiting an answered MC question in final feedback mode', async () => {
    const user = userEvent.setup();
    api.generateQuestion.mockResolvedValue({
      question: 'Questão final MC',
      reference_answer: 'Explicação',
      question_type: 'multiple_choice',
      options: sampleMcOptions,
      correct_option_id: 'B',
      chunk_used: 'Fonte',
      chunk_index: 0,
    });
    api.evaluateAnswer.mockResolvedValue({
      attempt_id: 'att-1',
      score: 0,
      feedback: 'Feedback oculto',
      model_answer: 'B) Fêmur',
      question_type: 'multiple_choice',
    });

    const { container } = render(
      <Home language="pt-BR" resumeRequest={{ documentId: 'doc-1', plannedQuestionCount: 2 }} />,
    );

    await screen.findByRole('button', { name: /Apenas múltipla escolha/i });
    await user.click(screen.getByRole('button', { name: /Apenas múltipla escolha/i }));
    await user.click(screen.getByRole('button', { name: /Ao final da sessão/i }));
    await user.click(container.querySelector('#start-study-session-btn'));

    await screen.findByText('Questão final MC');
    await user.click(screen.getByRole('radio', { name: /Úmero/i }));
    await user.click(container.querySelector('#submit-mc-answer-btn'));

    // Automatically moved to Q2; go back to Q1 and verify no spoilers
    await waitFor(() => expect(api.generateQuestion).toHaveBeenCalledTimes(2));
    await user.click(nav(1));
    expect(screen.queryByText('Correta')).toBeNull();
    expect(screen.queryByText('Feedback oculto')).toBeNull();
    expect(screen.getByRole('radio', { name: /Úmero/i }).checked).toBe(true);
    expect(screen.getByRole('radio', { name: /Úmero/i }).disabled).toBe(true);
    expect(screen.getByText('Editar resposta')).toBeTruthy();
  });

  it('displays question mode in history sidebar and resumes saved MC attempt', async () => {
    const user = userEvent.setup();
    const onResumeStudy = vi.fn();
    api.listStudyHistory.mockResolvedValue([
      {
        id: 'sess-mc',
        document_id: 'doc-1',
        document_filename: 'atlas.pdf',
        topic_titles: ['Osteologia'],
        planned_question_count: 2,
        difficulty: 'medium',
        question_mode: 'multiple_choice',
        feedback_mode: 'immediate',
        answered_question_count: 1,
        average_score: 10,
        status: 'active',
        started_at: '2026-11-16T12:00:00Z',
        attempts: [
          {
            id: 'att-1',
            question_position: 1,
            question: 'Qual é o osso da coxa?',
            reference_answer: 'O fêmur.',
            student_answer: 'B) Fêmur',
            score: 10,
            feedback: 'Resposta correta!',
            model_answer: 'B) Fêmur\n\nO fêmur.',
            question_type: 'multiple_choice',
            options: sampleMcOptions,
            correct_option_id: 'B',
            selected_option_id: 'B',
            topic_title: 'Osteologia',
          },
        ],
        last_attempt: {
          id: 'att-1',
          question_position: 1,
          question: 'Qual é o osso da coxa?',
          reference_answer: 'O fêmur.',
          student_answer: 'B) Fêmur',
          score: 10,
          feedback: 'Resposta correta!',
          model_answer: 'B) Fêmur\n\nO fêmur.',
          question_type: 'multiple_choice',
          options: sampleMcOptions,
          correct_option_id: 'B',
          selected_option_id: 'B',
          topic_title: 'Osteologia',
        },
      },
    ]);

    render(
      <Layout
        language="pt-BR"
        session={{}}
        user={{ email: 'student@example.com' }}
        onResumeStudy={onResumeStudy}
      />,
    );

    await user.click(screen.getByRole('button', { name: /conta/i }));
    await screen.findByText('Apenas múltipla escolha');
    await user.click(screen.getByRole('button', { name: /Refazer última pergunta/i }));

    expect(onResumeStudy).toHaveBeenCalledWith(expect.objectContaining({
      questionMode: 'multiple_choice',
      lastAttempt: expect.objectContaining({
        questionType: 'multiple_choice',
        correctOptionId: 'B',
        selectedOptionId: 'B',
        options: sampleMcOptions,
      }),
    }));
  });
});
