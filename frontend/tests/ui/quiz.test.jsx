import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../../src/pages/Home';
import * as api from '../../src/lib/api';

vi.mock('../../src/lib/api', () => ({
  analyzeTopics: vi.fn(), completeStudySession: vi.fn(), createStudySession: vi.fn(), deleteDocument: vi.fn(),
  evaluateAnswer: vi.fn(), generateQuestion: vi.fn(), restoreTopics: vi.fn(), uploadPdf: vi.fn(),
}));
vi.mock('../../src/components/StudySetup', () => ({default: (props) => <div>
  <button onClick={() => props.onFeedbackModeChange('final')}>Feedback final</button>
  <button onClick={props.onStart}>Começar</button>
</div>}));

beforeEach(() => {
  vi.resetAllMocks();
  api.restoreTopics.mockResolvedValue({topics:[{id:'bones',title:'Ossos',chunk_indices:[0]}]});
  api.createStudySession.mockResolvedValue({id:'session'});
  let sequence=0;
  api.generateQuestion.mockImplementation(async () => ({question:`Pergunta gerada ${++sequence}`,reference_answer:'Modelo',chunk_used:'Fonte',chunk_index:0}));
  api.evaluateAnswer.mockImplementation(async ({questionPosition}) => ({score:5,feedback:'Feedback privado',model_answer:'Modelo',attempt_id:`attempt-${questionPosition}`}));
  api.completeStudySession.mockResolvedValue(undefined);
});

async function start({final=false,count=3}={}) {
  const user=userEvent.setup();
  const view=render(<Home language="pt-BR" resumeRequest={{documentId:'doc',plannedQuestionCount:count}} />);
  await screen.findByRole('button',{name:'Começar'});
  if(final) await user.click(screen.getByText('Feedback final'));
  await user.click(screen.getByText('Começar'));
  await screen.findByText('Pergunta gerada 1');
  return {user,...view};
}
const nav=(number)=>screen.getByRole('button',{name:new RegExp(`^Pergunta ${number} —`)});
async function answer(user,container,text='Minha resposta') {
  await user.type(container.querySelector('textarea'),text);
  await user.click(container.querySelector('#submit-audio-answer-btn'));
  await waitFor(()=>expect(api.evaluateAnswer).toHaveBeenCalled());
}

describe('free question navigation', () => {
  it('preserves text drafts and generated questions when jumping forward and back', async () => {
    const {user,container}=await start();
    await user.type(container.querySelector('textarea'),'Rascunho da primeira');
    await user.click(nav(3));
    await screen.findByText('Pergunta gerada 2');
    await user.type(container.querySelector('textarea'),'Rascunho da terceira');
    await user.click(nav(1));
    expect(container.querySelector('textarea').value).toBe('Rascunho da primeira');
    await user.click(nav(3));
    expect(container.querySelector('textarea').value).toBe('Rascunho da terceira');
    expect(api.generateQuestion).toHaveBeenCalledTimes(2);
    expect(container.querySelector('#finish-session-btn')).toBeNull();
  });
  it.each([3,7,9])('exposes a primary summary action regardless of score %s', async (score) => {
    api.evaluateAnswer.mockResolvedValue({score,feedback:'Feedback',model_answer:'Modelo',attempt_id:'attempt'});
    const {user,container}=await start({count:1});
    await answer(user,container);
    await screen.findAllByText('Finalizar e Ver Resumo');
    expect(container.querySelector('#recommended-action-btn').textContent).toContain('Finalizar e Ver Resumo');
    await user.click(container.querySelector('#finish-session-btn'));
    await waitFor(()=>expect(container.querySelector('#new-session-btn')).not.toBeNull());
    expect(api.completeStudySession).toHaveBeenCalledTimes(1);
    expect(api.evaluateAnswer).toHaveBeenCalledTimes(1);
  });
  it('does not finish when the highest numbered question is answered first', async () => {
    const {user,container}=await start();
    await user.click(nav(3)); await screen.findByText('Pergunta gerada 2');
    await answer(user,container);
    await waitFor(()=>expect(nav(3).textContent).toContain('✓'));
    expect(container.querySelector('#finish-session-btn')).toBeNull();
    expect(api.completeStudySession).not.toHaveBeenCalled();
    await user.click(nav(1));
    await answer(user,container);
    await user.click(nav(2)); await screen.findByText('Pergunta gerada 3');
    await answer(user,container);
    await waitFor(()=>expect(container.querySelector('#finish-session-btn')).not.toBeNull());
    expect(api.evaluateAnswer.mock.calls.map(([args])=>args.questionPosition)).toEqual([3,1,2]);
  });
  it('retains results after completion fails and permits retry', async () => {
    const {user,container}=await start({count:1});
    await answer(user,container);
    await screen.findAllByText('Finalizar e Ver Resumo');
    api.completeStudySession.mockRejectedValueOnce(new Error('Falha ao finalizar'));
    await user.click(container.querySelector('#finish-session-btn'));
    await screen.findByText('Falha ao finalizar');
    expect(container.querySelector('#new-session-btn')).toBeNull();
    await user.click(container.querySelector('#finish-session-btn'));
    await waitFor(()=>expect(container.querySelector('#new-session-btn')).not.toBeNull());
  });
  it('hides feedback until explicit completion in final mode and replaces edited attempts', async () => {
    const {user,container}=await start({final:true,count:1});
    await answer(user,container);
    await screen.findByText('Editar resposta');
    expect(screen.queryByText('Feedback privado')).toBeNull();
    await user.click(screen.getByText('Editar resposta'));
    expect(container.querySelector('#finish-session-btn')).toBeNull();
    await user.type(container.querySelector('textarea'),' melhorada');
    await user.click(container.querySelector('#submit-audio-answer-btn'));
    await waitFor(()=>expect(api.evaluateAnswer).toHaveBeenCalledTimes(2));
    expect(api.evaluateAnswer.mock.calls[1][0].retryAttemptId).toBe('attempt-1');
    await user.click(container.querySelector('#finish-session-btn'));
    await waitFor(()=>expect(container.querySelector('#new-session-btn')).not.toBeNull());
    expect(container.querySelectorAll('section > .space-y-2 > details').length).toBe(1);
  });
  it('can recover a failed question load without starting another session', async () => {
    const {user,container}=await start();
    await user.type(container.querySelector('textarea'),'Texto preservado');
    api.generateQuestion.mockRejectedValueOnce(new Error('Falha de geração'));
    await user.click(nav(2));
    await screen.findByText('Falha de geração');
    await user.click(nav(1));
    expect(container.querySelector('textarea').value).toBe('Texto preservado');
    await user.click(nav(2));
    await screen.findByText('Pergunta gerada 2');
    expect(api.createStudySession).toHaveBeenCalledTimes(1);
  });

  it('resumes answered positions without regeneration and keeps final feedback hidden', async () => {
    const user=userEvent.setup();
    const attempts=[1,3].map(position=>({id:`saved-${position}`,questionPosition:position,
      question:`Pergunta salva ${position}`,referenceAnswer:'Modelo',topicTitle:'Ossos',
      studentAnswer:`Resposta ${position}`,score:7,feedback:'Correção oculta'}));
    const {container}=render(<Home language="pt-BR" resumeRequest={{documentId:'doc',
      plannedQuestionCount:3,studySessionId:'saved-session',feedbackMode:'final',
      savedAttempts:attempts,lastAttempt:attempts[1]}} />);
    await screen.findByText('Pergunta salva 3');
    expect(container.querySelector('#finish-session-btn')).toBeNull();
    expect(screen.queryByText('Correção oculta')).toBeNull();
    await user.click(nav(1));
    expect(container.querySelector('textarea').value).toBe('Resposta 1');
    expect(api.generateQuestion).not.toHaveBeenCalled();
    await user.click(nav(2));
    await screen.findByText('Pergunta gerada 1');
    await answer(user,container);
    await waitFor(()=>expect(container.querySelector('#finish-session-btn')).not.toBeNull());
    await user.click(container.querySelector('#finish-session-btn'));
    await waitFor(()=>expect(container.querySelector('#new-session-btn')).not.toBeNull());
    expect(container.querySelectorAll('section > .space-y-2 > details').length).toBe(3);
    expect(api.createStudySession).not.toHaveBeenCalled();
  });

  it('locks navigation while evaluating and preserves the answer on failure', async () => {
    const {user,container}=await start();
    let rejectEvaluation;
    api.evaluateAnswer.mockImplementationOnce(()=>new Promise((_,reject)=>{rejectEvaluation=reject;}));
    await answer(user,container);
    expect(nav(2).disabled).toBe(true);
    expect(container.querySelector('textarea').disabled).toBe(true);
    rejectEvaluation(new Error('Falha ao salvar'));
    await screen.findByText('Falha ao salvar');
    expect(container.querySelector('textarea').value).toBe('Minha resposta');
    expect(nav(2).disabled).toBe(false);
    expect(nav(1).textContent).not.toContain('✓');
  });
});
