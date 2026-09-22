/**
 * Home — orchestrates upload, study setup, question session, and review.
 */

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  FileText,
  ListTree,
  MessageSquare,
  RotateCcw,
  Send,
  Upload,
  Zap,
} from 'lucide-react';

import AudioRecorder from '../components/AudioRecorder';
import ContentWarningModal from '../components/ContentWarningModal';
import PdfUpload from '../components/PdfUpload';
import QuestionCard from '../components/QuestionCard';
import ResultCard from '../components/ResultCard';
import StudySetup from '../components/StudySetup';
import {
  analyzeTopics,
  completeStudySession,
  createStudySession,
  deleteDocument,
  evaluateAnswer,
  generateQuestion,
  uploadPdf,
} from '../lib/api';
import { getTranslations } from '../i18n';

const STEPS = {
  UPLOAD: 'upload',
  CONTENT_WARNING: 'content_warning',
  SETUP: 'setup',
  QUESTION: 'question',
  ANSWER: 'answer',
  RESULT: 'result',
  SUMMARY: 'summary',
};

const FEEDBACK_MODES = {
  IMMEDIATE: 'immediate',
  FINAL: 'final',
};

const DIFFICULTIES = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

const MAX_SESSION_QUESTIONS = 20;

function createQuestionPlan(selectedTopics, questionCount) {
  return Array.from(
    { length: questionCount },
    (_, index) => selectedTopics[index % selectedTopics.length].id,
  );
}

export default function Home({ language, onProgressChange, resumeRequest, onResumeHandled }) {
  const copy = getTranslations(language);
  const [step, setStep] = useState(STEPS.UPLOAD);

  // Document and generated study map
  const [documentId, setDocumentId] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [studySessionId, setStudySessionId] = useState(null);
  const [totalChunks, setTotalChunks] = useState(0);
  const [topics, setTopics] = useState([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState([]);

  // Session preferences and progress
  const [questionCount, setQuestionCount] = useState(1);
  const [difficulty, setDifficulty] = useState(DIFFICULTIES.MEDIUM);
  const [feedbackMode, setFeedbackMode] = useState(FEEDBACK_MODES.IMMEDIATE);
  const [questionPlan, setQuestionPlan] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sessionResults, setSessionResults] = useState([]);
  const [savedSessionContinuation, setSavedSessionContinuation] = useState(null);

  // Active question
  const [activeTopic, setActiveTopic] = useState(null);
  const [question, setQuestion] = useState('');
  const [referenceAnswer, setReferenceAnswer] = useState('');
  const [chunkUsed, setChunkUsed] = useState('');
  const [chunkIndex, setChunkIndex] = useState(null);
  const [sourceExcerpt, setSourceExcerpt] = useState('');
  const [retryAttemptId, setRetryAttemptId] = useState(null);

  // Answer and result
  const [studentAnswer, setStudentAnswer] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [result, setResult] = useState(null);

  // UI state
  const [isUploading, setIsUploading] = useState(false);
  const [isRestoringMaterial, setIsRestoringMaterial] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);
  const [error, setError] = useState(null);

  // Every step transition (e.g. submitting an answer) should land at the top,
  // not wherever the user had scrolled to on the previous step.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const progressSteps = [
    { key: STEPS.UPLOAD, label: copy.home.steps.upload, icon: Upload },
    { key: STEPS.SETUP, label: copy.home.steps.setup, icon: ListTree },
    { key: STEPS.ANSWER, label: copy.home.steps.answer, icon: MessageSquare },
    { key: STEPS.SUMMARY, label: copy.home.steps.summary, icon: BarChart3 },
  ];
  const progressKey = [STEPS.QUESTION, STEPS.ANSWER, STEPS.RESULT].includes(step)
    ? STEPS.ANSWER
    : step === STEPS.CONTENT_WARNING
      ? STEPS.UPLOAD
      : step;
  const currentProgressIndex = progressSteps.findIndex((item) => item.key === progressKey);

  useEffect(() => {
    onProgressChange?.(progressKey);
  }, [onProgressChange, progressKey]);

  const resetQuestionState = () => {
    setActiveTopic(null);
    setQuestion('');
    setReferenceAnswer('');
    setChunkUsed('');
    setChunkIndex(null);
    setSourceExcerpt('');
    setRetryAttemptId(null);
    setStudentAnswer('');
    setAudioBlob(null);
    setResult(null);
  };

  useEffect(() => {
    if (!resumeRequest?.documentId) return undefined;

    let cancelled = false;

    const resumeMaterial = async () => {
      setIsUploading(true);
      setIsRestoringMaterial(true);
      setError(null);
      resetQuestionState();
      setStudySessionId(null);
      setQuestionPlan([]);
      setCurrentQuestionIndex(0);
      setSessionResults([]);

      try {
        const savedAttempts = resumeRequest.savedAttempts || [];
        const savedAttempt = resumeRequest.resumeFromBeginning
          ? savedAttempts[0]
          : resumeRequest.lastAttempt;
        if (savedAttempt) {
          const attempt = savedAttempt;
          const savedQuestionCount = Number(resumeRequest.plannedQuestionCount);
          const plannedQuestionCount = Math.max(
            1,
            Math.min(
              Number.isFinite(savedQuestionCount) ? savedQuestionCount : 1,
              MAX_SESSION_QUESTIONS,
            ),
          );
          const savedQuestionIndex = Math.min(
            Math.max((Number(attempt.questionPosition) || 1) - 1, 0),
            plannedQuestionCount - 1,
          );
          setDocumentId(resumeRequest.documentId);
          setDocumentName(resumeRequest.documentName || 'PDF');
          setTotalChunks(0);
          setTopics([]);
          setSelectedTopicIds([]);
          setQuestionCount(plannedQuestionCount);
          setDifficulty(resumeRequest.difficulty || DIFFICULTIES.MEDIUM);
          setFeedbackMode(FEEDBACK_MODES.IMMEDIATE);
          setStudySessionId(resumeRequest.studySessionId || null);
          setQuestionPlan(Array.from(
            { length: plannedQuestionCount },
            (_, index) => (index === savedQuestionIndex ? 'saved-question' : null),
          ));
          setCurrentQuestionIndex(savedQuestionIndex);
          setSavedSessionContinuation({
            topicTitles: resumeRequest.topicTitles || [],
            plannedQuestionCount,
            savedAttempts,
          });
          setActiveTopic({ id: 'saved-question', title: attempt.topicTitle || '' });
          setQuestion(attempt.question);
          setReferenceAnswer(attempt.referenceAnswer);
          setChunkUsed('');
          setChunkIndex(null);
          setSourceExcerpt(attempt.sourceExcerpt || '');
          setRetryAttemptId(resumeRequest.retryAttemptId || null);
          setStep(STEPS.ANSWER);
          return;
        }

        const analysis = await analyzeTopics(resumeRequest.documentId, language);
        if (cancelled) return;

        const allTopicIds = analysis.topics.map((topic) => topic.id);
        const requestedTopics = resumeRequest.topicTitles || [];
        const matchingTopicIds = analysis.topics
          .filter((topic) => requestedTopics.includes(topic.title))
          .map((topic) => topic.id);
        const restoredTopicIds = matchingTopicIds.length > 0 ? matchingTopicIds : allTopicIds;
        const savedQuestionCount = Number(resumeRequest.plannedQuestionCount);
        const restoredQuestionCount = Math.max(
          restoredTopicIds.length,
          Math.min(
            Number.isFinite(savedQuestionCount) ? savedQuestionCount : restoredTopicIds.length,
            MAX_SESSION_QUESTIONS,
          ),
        );

        setDocumentId(resumeRequest.documentId);
        setDocumentName(resumeRequest.documentName || 'PDF');
        setTotalChunks(0);
        setTopics(analysis.topics);
        setSelectedTopicIds(restoredTopicIds);
        setQuestionCount(restoredQuestionCount);
        setDifficulty(resumeRequest.difficulty || DIFFICULTIES.MEDIUM);
        setFeedbackMode(resumeRequest.feedbackMode || FEEDBACK_MODES.IMMEDIATE);
        setSavedSessionContinuation(null);
        setStep(analysis.is_veterinary === false ? STEPS.CONTENT_WARNING : STEPS.SETUP);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) {
          setIsUploading(false);
          setIsRestoringMaterial(false);
          onResumeHandled?.();
        }
      }
    };

    resumeMaterial();
    return () => { cancelled = true; };
  }, [language, onResumeHandled, resumeRequest]);

  const loadQuestion = async (position, plan = questionPlan, topicList = topics) => {
    const topicId = plan[position];
    const topic = topicList.find((item) => item.id === topicId);
    if (!topic) {
      setError(copy.home.sessionTopicError);
      return;
    }

    setIsGenerating(true);
    setError(null);
    resetQuestionState();
    setCurrentQuestionIndex(position);
    setStep(STEPS.QUESTION);

    try {
      const data = await generateQuestion(documentId, {
        chunkIndices: topic.chunk_indices,
        topicTitle: topic.title,
        difficulty,
        language,
      });
      setActiveTopic(topic);
      setQuestion(data.question);
      setReferenceAnswer(data.reference_answer);
      setChunkUsed(data.chunk_used);
      setChunkIndex(data.chunk_index);
      setSourceExcerpt(data.source?.excerpt || '');
      setStep(STEPS.ANSWER);
    } catch (requestError) {
      setError(requestError.message);
      setStep(STEPS.SETUP);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpload = async (file) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setSavedSessionContinuation(null);
    try {
      const upload = await uploadPdf(file, language, setUploadProgress);
      const analysis = await analyzeTopics(upload.document_id, language);
      setDocumentId(upload.document_id);
      setDocumentName(upload.filename);
      setTotalChunks(upload.num_chunks);
      setTopics(analysis.topics);
      const allTopicIds = analysis.topics.map((topic) => topic.id);
      setSelectedTopicIds(allTopicIds);
      setQuestionCount(Math.min(allTopicIds.length, MAX_SESSION_QUESTIONS));

      if (analysis.is_veterinary === false) {
        setStep(STEPS.CONTENT_WARNING);
      } else {
        setStep(STEPS.SETUP);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleContentWarningContinue = () => {
    setStep(STEPS.SETUP);
  };

  const handleContentWarningUploadAnother = async () => {
    if (!documentId) return;
    setIsDeletingDocument(true);
    try {
      await deleteDocument(documentId, language);
    } catch {
      // Best effort — even if deletion fails, reset UI so user can try again
    } finally {
      setIsDeletingDocument(false);
    }
    handleReset();
  };

  const handleStartSession = async () => {
    const selectedTopics = topics.filter((topic) => selectedTopicIds.includes(topic.id));
    if (!selectedTopics.length || selectedTopics.length > MAX_SESSION_QUESTIONS) return;

    const totalQuestions = Math.max(
      selectedTopics.length,
      Math.min(questionCount, MAX_SESSION_QUESTIONS),
    );
    try {
      const studySession = await createStudySession({
        documentId,
        topicTitles: selectedTopics.map((topic) => topic.title),
        plannedQuestionCount: totalQuestions,
        difficulty,
        feedbackMode,
        language,
      });
      const plan = createQuestionPlan(selectedTopics, totalQuestions);
      setStudySessionId(studySession.id);
      setQuestionPlan(plan);
      setSessionResults([]);
      setSavedSessionContinuation(null);
      await loadQuestion(0, plan);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleSelectedTopicsChange = (topicIds) => {
    setSelectedTopicIds(topicIds);
    if (topicIds.length > 0 && topicIds.length <= MAX_SESSION_QUESTIONS) {
      setQuestionCount((currentCount) => Math.max(topicIds.length, currentCount));
    }
  };

  const prepareSavedSessionContinuation = async () => {
    const analysis = await analyzeTopics(documentId, language);
    const requestedTopics = savedSessionContinuation?.topicTitles || [];
    const matchingTopics = analysis.topics.filter((topic) => requestedTopics.includes(topic.title));
    const restoredTopics = matchingTopics.length > 0 ? matchingTopics : analysis.topics;
    if (!restoredTopics.length) {
      throw new Error(copy.home.sessionTopicError);
    }

    // Retomar uma sessão nunca deve alterar a quantidade escolhida pelo aluno.
    const totalQuestions = Math.max(
      1,
      Math.min(savedSessionContinuation?.plannedQuestionCount || 1, MAX_SESSION_QUESTIONS),
    );
    return {
      topics: restoredTopics,
      plan: createQuestionPlan(restoredTopics, totalQuestions),
      totalQuestions,
    };
  };

  const advanceSession = async () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= questionPlan.length) {
      if (studySessionId) {
        try {
          await completeStudySession(studySessionId, language);
        } catch (requestError) {
          setError(requestError.message);
        }
      }
      setStep(STEPS.SUMMARY);
      return;
    }

    let plan = questionPlan;
    let topicList = topics;
    if (savedSessionContinuation) {
      const savedQuestion = savedSessionContinuation.savedAttempts?.find(
        (attempt) => Number(attempt.questionPosition) === nextIndex + 1,
      );
      if (savedQuestion) {
        resetQuestionState();
        setCurrentQuestionIndex(nextIndex);
        setActiveTopic({ id: 'saved-question', title: savedQuestion.topicTitle || '' });
        setQuestion(savedQuestion.question);
        setReferenceAnswer(savedQuestion.referenceAnswer);
        setChunkUsed('');
        setChunkIndex(null);
        setSourceExcerpt(savedQuestion.sourceExcerpt || '');
        setRetryAttemptId(savedQuestion.id);
        setStep(STEPS.ANSWER);
        return;
      }

      setIsGenerating(true);
      setError(null);
      setQuestion('');
      setStep(STEPS.QUESTION);
      try {
        const restoredSession = await prepareSavedSessionContinuation();
        plan = restoredSession.plan;
        topicList = restoredSession.topics;
        setTopics(restoredSession.topics);
        setSelectedTopicIds(restoredSession.topics.map((topic) => topic.id));
        setQuestionCount(restoredSession.totalQuestions);
        setQuestionPlan(restoredSession.plan);
        setSavedSessionContinuation(null);
      } catch (requestError) {
        setError(requestError.message);
        setStep(STEPS.RESULT);
        setIsGenerating(false);
        return;
      }
    }
    await loadQuestion(nextIndex, plan, topicList);
  };

  const handleSubmitAnswer = async () => {
    if (!studentAnswer.trim()) return;

    setIsEvaluating(true);
    setError(null);
    try {
      const evaluation = await evaluateAnswer({
        question,
        referenceAnswer,
        studentAnswer: studentAnswer.trim(),
        audioBlob,
        documentId,
        chunkIndex,
        sourceExcerpt,
        studySessionId,
        topicTitle: activeTopic?.title || null,
        questionPosition: currentQuestionIndex + 1,
        retryAttemptId,
        difficulty,
        language,
      });
      const attempt = {
        topicTitle: activeTopic?.title || '',
        question,
        result: evaluation,
      };
      setSessionResults((previous) => [...previous, attempt]);
      setResult(evaluation);

      if (feedbackMode === FEEDBACK_MODES.IMMEDIATE) {
        setStep(STEPS.RESULT);
      } else {
        await advanceSession();
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleConfigureAgain = () => {
    resetQuestionState();
    setStudySessionId(null);
    setQuestionPlan([]);
    setCurrentQuestionIndex(0);
    setSessionResults([]);
    setSavedSessionContinuation(null);
    setError(null);
    setStep(STEPS.SETUP);
  };

  const handleReset = () => {
    resetQuestionState();
    setDocumentId(null);
    setDocumentName('');
    setStudySessionId(null);
    setTotalChunks(0);
    setTopics([]);
    setSelectedTopicIds([]);
    setQuestionPlan([]);
    setCurrentQuestionIndex(0);
    setSessionResults([]);
    setSavedSessionContinuation(null);
    setError(null);
    setStep(STEPS.UPLOAD);
  };

  const handleRetryQuestion = () => {
    setStudentAnswer('');
    setAudioBlob(null);
    setResult(null);
    setStep(STEPS.ANSWER);
  };

  const handleAnotherQuestionSameTopic = async () => {
    if (!activeTopic) return;
    if (savedSessionContinuation) {
      await advanceSession();
      return;
    }
    setRetryAttemptId(null);
    const nextPosition = currentQuestionIndex + 1;
    if (nextPosition >= questionPlan.length) {
      await advanceSession();
      return;
    }

    // Pratica o mesmo assunto na próxima posição já existente, sem adicionar
    // questões além da quantidade escolhida na configuração da sessão.
    const adjustedPlan = questionPlan.map((topicId, index) => (
      index === nextPosition ? activeTopic.id : topicId
    ));
    setQuestionPlan(adjustedPlan);
    await loadQuestion(nextPosition, adjustedPlan);
  };

  const averageScore = sessionResults.length
    ? sessionResults.reduce((sum, attempt) => sum + attempt.result.score, 0) / sessionResults.length
    : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <nav className="flex lg:hidden items-center gap-1" aria-label={copy.home.progress}>
        {progressSteps.map((item, index) => {
          const Icon = item.icon;
          const isActive = index === currentProgressIndex;
          const isDone = index < currentProgressIndex;
          return (
            <div key={item.key} className="flex items-center gap-1">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-500 transition-all duration-200 ${
                  isActive ? 'bg-teal-500/15 text-teal-400' : isDone ? 'text-teal-400/60' : 'text-text-3'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
              </div>
              {index < progressSteps.length - 1 && (
                <ArrowRight className={`w-3 h-3 ${isDone ? 'text-teal-400/40' : 'text-border-subtle'}`} />
              )}
            </div>
          );
        })}
      </nav>

      {isRestoringMaterial && (
        <section
          className="card animate-enter p-4"
          role="status"
          aria-live="polite"
          aria-label={copy.home.restoringMaterial}
        >
          <div className="flex items-center gap-3">
            <span className="spinner w-5 h-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-700 text-text-1">{copy.home.restoringMaterial}</p>
              <p className="mt-0.5 text-xs text-text-3">{copy.home.restoringMaterialDescription}</p>
            </div>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
            <div className="h-full w-2/3 rounded-full bg-teal-400 animate-pulse" />
          </div>
        </section>
      )}

      {documentId && step !== STEPS.UPLOAD && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-surface-1 border border-border-subtle text-sm">
          <div className="flex items-center gap-2 text-text-2 min-w-0">
            <FileText className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="truncate">{documentName}</span>
            {totalChunks > 0 && (
              <span className="text-text-3 shrink-0">{totalChunks} {copy.home.excerpts}</span>
            )}
            {questionPlan.length > 0 && step !== STEPS.SETUP && (
              <span className="text-teal-400 shrink-0">
                {copy.home.questionProgress
                  .replace('{current}', Math.min(currentQuestionIndex + 1, questionPlan.length))
                  .replace('{total}', questionPlan.length)}
              </span>
            )}
          </div>
          <button
            id="reset-btn"
            type="button"
            onClick={handleReset}
            className="text-xs text-text-3 hover:text-text-2 transition-colors flex items-center gap-1 shrink-0 ml-2"
          >
            <RotateCcw className="w-3 h-3" />
            {copy.home.changeDocument}
          </button>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-lg border border-danger/30 bg-danger-muted/10 text-sm text-danger">
          {error}
        </div>
      )}

      {step === STEPS.UPLOAD && (
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-['Plus_Jakarta_Sans'] font-800 tracking-tight text-text-1">
              {copy.home.uploadTitle}
            </h2>
            <p className="text-sm text-text-3 mt-1">{copy.home.uploadDescription}</p>
          </div>
          <PdfUpload
            onUpload={handleUpload}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            language={language}
          />
        </section>
      )}

      {step === STEPS.CONTENT_WARNING && (
        <ContentWarningModal
          onContinue={handleContentWarningContinue}
          onUploadAnother={handleContentWarningUploadAnother}
          isDeleting={isDeletingDocument}
          language={language}
        />
      )}

      {step === STEPS.SETUP && (
        <StudySetup
          topics={topics}
          selectedTopicIds={selectedTopicIds}
          onSelectedTopicsChange={handleSelectedTopicsChange}
          questionCount={questionCount}
          onQuestionCountChange={setQuestionCount}
          maxQuestions={MAX_SESSION_QUESTIONS}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          feedbackMode={feedbackMode}
          onFeedbackModeChange={setFeedbackMode}
          onStart={handleStartSession}
          language={language}
        />
      )}

      {(step === STEPS.QUESTION || isGenerating) && !question && (
        <QuestionCard question="" isLoading language={language} />
      )}

      {step === STEPS.ANSWER && !isGenerating && (
        <div className="space-y-4 animate-enter">
          <QuestionCard
            question={question}
            chunkUsed={chunkUsed}
            isLoading={false}
            language={language}
          />

          {activeTopic && (
            <p className="text-xs text-text-3 px-1">
              {copy.home.currentTopic.replace('{topic}', activeTopic.title)}
            </p>
          )}

          <div className="space-y-4">
            <AudioRecorder
              onRecordingComplete={setAudioBlob}
              onRecordingReset={() => {
                setAudioBlob(null);
                setStudentAnswer('');
              }}
              transcriptValue={studentAnswer}
              onTranscriptChange={setStudentAnswer}
              disabled={isEvaluating}
              language={language}
            />
            <button
              id="submit-audio-answer-btn"
              type="button"
              onClick={handleSubmitAnswer}
              disabled={!studentAnswer.trim() || isEvaluating}
              className="btn-primary w-full"
            >
              {isEvaluating ? <><span className="spinner" />{copy.home.evaluating}</> : <>{copy.home.submitVoiceAnswer}<Send className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}

      {step === STEPS.RESULT && result && (
        <div className="space-y-4">
          <ResultCard
            score={result.score}
            feedback={result.feedback}
            modelAnswer={result.model_answer}
            source={result.source}
            onRetryQuestion={handleRetryQuestion}
            onAnotherQuestionSameTopic={handleAnotherQuestionSameTopic}
            onContinue={advanceSession}
            isLastQuestion={currentQuestionIndex + 1 >= questionPlan.length}
            language={language}
          />
          <button id="configure-session-btn" type="button" onClick={handleConfigureAgain} className="btn-secondary w-full">
            <SlidersIcon />
            {copy.home.configureSession}
          </button>
        </div>
      )}

      {step === STEPS.SUMMARY && (
        <section className="space-y-4 animate-enter">
          <div className="card p-6">
            <h2 className="text-xl font-['Plus_Jakarta_Sans'] font-800 text-text-1">{copy.home.summaryTitle}</h2>
            <p className="text-sm text-text-3 mt-1">{copy.home.summaryDescription}</p>
            <div className="mt-5 flex items-end gap-2">
              <span className="text-4xl font-['Plus_Jakarta_Sans'] font-800 text-teal-400">{averageScore.toFixed(1)}</span>
              <span className="text-sm text-text-3 mb-1">{copy.home.averageScore}</span>
            </div>
          </div>

          <div className="space-y-2">
            {sessionResults.map((attempt, index) => (
              <details key={`${attempt.question}-${index}`} className="card group">
                <summary className="p-4 cursor-pointer list-none flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-600 text-text-1 truncate">
                      {copy.home.questionNumber.replace('{number}', index + 1)} · {attempt.topicTitle}
                    </span>
                    <span className="block text-xs text-text-3 mt-1 truncate">{attempt.question}</span>
                  </span>
                  <span className="text-sm font-700 text-teal-400 shrink-0">{attempt.result.score.toFixed(1)}</span>
                </summary>
                <div className="px-4 pb-4 border-t border-border-subtle pt-4 space-y-3">
                  <div>
                    <p className="text-xs font-600 text-teal-400 mb-1">{copy.result.modelAnswer}</p>
                    <p className="text-sm text-text-2 leading-relaxed whitespace-pre-line">{attempt.result.model_answer}</p>
                  </div>
                  {attempt.result.source && (
                    <div className="rounded-lg bg-surface-0 border border-border-subtle p-3">
                      <p className="text-xs font-600 text-teal-400 mb-1">{copy.result.source}</p>
                      <p className="text-xs text-text-3 leading-relaxed">“{attempt.result.source.excerpt}”</p>
                      <p className="text-xs text-text-3 mt-2">{formatSourcePage(attempt.result.source.page_number, copy)}</p>
                    </div>
                  )}
                  {attempt.result.feedback && (
                    <details className="text-sm">
                      <summary className="text-teal-400 cursor-pointer">{copy.result.feedback}</summary>
                      <p className="text-text-2 leading-relaxed whitespace-pre-line mt-2">{attempt.result.feedback}</p>
                    </details>
                  )}
                </div>
              </details>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button id="new-session-btn" type="button" onClick={handleConfigureAgain} className="btn-primary flex-1">
              <Zap className="w-4 h-4" />
              {copy.home.newSession}
            </button>
            <button id="new-pdf-btn" type="button" onClick={handleReset} className="btn-secondary">
              <RotateCcw className="w-4 h-4" />
              {copy.home.newPdf}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function SlidersIcon() {
  return <RotateCcw className="w-4 h-4" />;
}

function formatSourcePage(pageNumber, copy) {
  return pageNumber
    ? copy.result.sourcePage.replace('{page}', pageNumber)
    : copy.result.sourcePageUnavailable;
}
