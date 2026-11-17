/**
 * Home — orchestrates upload, study setup, question session, and review.
 */

import { useEffect, useRef, useState } from 'react';
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
import MultipleChoiceOptions from '../components/MultipleChoiceOptions';
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
  getStudySession,
  restoreTopics,
  uploadPdf,
} from '../lib/api';
import { getTranslations, translateErrorMessage } from '../i18n';
import { formatScore, legacyScoreNotice } from '../lib/study-score';

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

const QUESTION_MODES = {
  DESCRIPTIVE: 'descriptive',
  MULTIPLE_CHOICE: 'multiple_choice',
  MIXED: 'mixed',
};

const QUESTION_TYPES = {
  DESCRIPTIVE: 'descriptive',
  MULTIPLE_CHOICE: 'multiple_choice',
};

const MAX_SESSION_QUESTIONS = 20;

function createQuestionPlan(
  selectedTopics,
  questionCount,
  questionMode = QUESTION_MODES.DESCRIPTIVE,
  existingTypesByPosition = {},
) {
  const slots = Array.from({ length: questionCount }, (_, index) => ({
    topicId: selectedTopics[index % selectedTopics.length].id,
    questionType:
      existingTypesByPosition[index]
      || (questionMode === QUESTION_MODES.MULTIPLE_CHOICE
        ? QUESTION_TYPES.MULTIPLE_CHOICE
        : QUESTION_TYPES.DESCRIPTIVE),
  }));

  if (questionMode !== QUESTION_MODES.MIXED) {
    return slots;
  }

  const remainingPositions = [];
  let existingMc = 0;
  let existingDesc = 0;
  for (let index = 0; index < questionCount; index += 1) {
    const fixedType = existingTypesByPosition[index];
    if (fixedType === QUESTION_TYPES.MULTIPLE_CHOICE) existingMc += 1;
    else if (fixedType === QUESTION_TYPES.DESCRIPTIVE) existingDesc += 1;
    else remainingPositions.push(index);
  }

  if (!remainingPositions.length) {
    return slots;
  }

  let idealMc;
  if (questionCount % 2 === 0) {
    idealMc = questionCount / 2;
  } else if (existingMc > existingDesc) {
    idealMc = Math.ceil(questionCount / 2);
  } else if (existingDesc > existingMc) {
    idealMc = Math.floor(questionCount / 2);
  } else {
    idealMc = Math.random() < 0.5 ? Math.ceil(questionCount / 2) : Math.floor(questionCount / 2);
  }

  const neededMc = Math.max(0, Math.min(remainingPositions.length, idealMc - existingMc));
  const mixedTypes = Array.from({ length: remainingPositions.length }, (_, idx) => (
    idx < neededMc ? QUESTION_TYPES.MULTIPLE_CHOICE : QUESTION_TYPES.DESCRIPTIVE
  ));
  for (let i = mixedTypes.length - 1; i > 0; i -= 1) {
    const swapIndex = Math.floor(Math.random() * (i + 1));
    [mixedTypes[i], mixedTypes[swapIndex]] = [mixedTypes[swapIndex], mixedTypes[i]];
  }
  remainingPositions.forEach((position, idx) => {
    slots[position].questionType = mixedTypes[idx];
  });

  return slots;
}

export default function Home({ language, onProgressChange, resumeRequest, onResumeHandled }) {
  const copy = getTranslations(language);
  const questionCache = useRef({});
  const [persistedSummary, setPersistedSummary] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
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
  const [questionMode, setQuestionMode] = useState(QUESTION_MODES.DESCRIPTIVE);
  const [feedbackMode, setFeedbackMode] = useState(FEEDBACK_MODES.IMMEDIATE);
  const [questionPlan, setQuestionPlan] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [pendingEdits, setPendingEdits] = useState([]);
  const [sessionResults, setSessionResults] = useState([]);
  const [savedSessionContinuation, setSavedSessionContinuation] = useState(null);

  // Active question
  const [activeTopic, setActiveTopic] = useState(null);
  const [question, setQuestion] = useState('');
  const [referenceAnswer, setReferenceAnswer] = useState('');
  const [questionType, setQuestionType] = useState(QUESTION_TYPES.DESCRIPTIVE);
  const [options, setOptions] = useState([]);
  const [correctOptionId, setCorrectOptionId] = useState(null);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
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

  const snapshotQuestion = (overrides = {}) => ({
    activeTopic, question, referenceAnswer, questionType, options, correctOptionId, selectedOptionId,
    chunkUsed, chunkIndex, sourceExcerpt, retryAttemptId, studentAnswer, audioBlob, result, ...overrides,
  });

  const restoreQuestion = (entry) => {
    setActiveTopic(entry.activeTopic);
    setQuestion(entry.question);
    setReferenceAnswer(entry.referenceAnswer);
    setQuestionType(entry.questionType || QUESTION_TYPES.DESCRIPTIVE);
    setOptions(entry.options || []);
    setCorrectOptionId(entry.correctOptionId || null);
    setSelectedOptionId(entry.selectedOptionId || null);
    setChunkUsed(entry.chunkUsed || '');
    setChunkIndex(entry.chunkIndex ?? null);
    setSourceExcerpt(entry.sourceExcerpt || '');
    setRetryAttemptId(entry.retryAttemptId || null);
    setStudentAnswer(entry.studentAnswer || '');
    setAudioBlob(entry.audioBlob || null);
    setResult(entry.result || null);
    setStep(entry.result && feedbackMode === FEEDBACK_MODES.IMMEDIATE ? STEPS.RESULT : STEPS.ANSWER);
  };

  const resetQuestionState = () => {
    setActiveTopic(null);
    setQuestion('');
    setReferenceAnswer('');
    setQuestionType(QUESTION_TYPES.DESCRIPTIVE);
    setOptions([]);
    setCorrectOptionId(null);
    setSelectedOptionId(null);
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
      setPendingEdits([]);
      setPersistedSummary(null);
      questionCache.current = {};

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
          const restoredResults = [];
          for (const saved of savedAttempts) {
            const position = Number(saved.questionPosition) - 1;
            if (!Number.isInteger(position) || position < 0 || position >= plannedQuestionCount) continue;
            const evaluation = Number.isFinite(saved.score) ? {
              score: saved.score, feedback: saved.feedback || '', model_answer: saved.modelAnswer || saved.referenceAnswer,
              source: saved.sourceExcerpt ? { excerpt: saved.sourceExcerpt, page_number: saved.sourcePage } : null,
            } : null;
            questionCache.current[position] = {
              activeTopic: { id: 'saved-question', title: saved.topicTitle || '' },
              question: saved.question,
              referenceAnswer: saved.referenceAnswer,
              questionType: saved.questionType || QUESTION_TYPES.DESCRIPTIVE,
              options: saved.options || [],
              correctOptionId: saved.correctOptionId || null,
              selectedOptionId: saved.selectedOptionId || null,
              sourceExcerpt: saved.sourceExcerpt,
              retryAttemptId: saved.id,
              studentAnswer: saved.studentAnswer || '',
              result: evaluation,
            };
          }
          for (const [position, entry] of Object.entries(questionCache.current)) {
            if (entry.result) {
              restoredResults.push({
                position: Number(position),
                topicTitle: entry.activeTopic.title,
                question: entry.question,
                questionType: entry.questionType,
                options: entry.options,
                correctOptionId: entry.correctOptionId,
                selectedOptionId: entry.selectedOptionId,
                result: entry.result,
              });
            }
          }
          const resumeQuestionMode = resumeRequest.questionMode || QUESTION_MODES.DESCRIPTIVE;
          setSessionResults(restoredResults.sort((a, b) => a.position - b.position));
          setDocumentId(resumeRequest.documentId);
          setDocumentName(resumeRequest.documentName || 'PDF');
          setTotalChunks(0);
          setTopics([]);
          setSelectedTopicIds([]);
          setQuestionCount(plannedQuestionCount);
          setDifficulty(resumeRequest.difficulty || DIFFICULTIES.MEDIUM);
          setQuestionMode(resumeQuestionMode);
          setFeedbackMode(resumeRequest.feedbackMode || FEEDBACK_MODES.IMMEDIATE);
          setStudySessionId(resumeRequest.studySessionId || null);
          setQuestionPlan(Array.from(
            { length: plannedQuestionCount },
            (_, index) => {
              const cachedEntry = questionCache.current[index];
              return {
                topicId: index === savedQuestionIndex ? 'saved-question' : null,
                questionType: cachedEntry?.questionType || (resumeQuestionMode === QUESTION_MODES.MULTIPLE_CHOICE
                  ? QUESTION_TYPES.MULTIPLE_CHOICE
                  : QUESTION_TYPES.DESCRIPTIVE),
              };
            },
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
          const cached = questionCache.current[savedQuestionIndex];
          setQuestionType(cached?.questionType || attempt.questionType || QUESTION_TYPES.DESCRIPTIVE);
          setOptions(cached?.options || attempt.options || []);
          setCorrectOptionId(cached?.correctOptionId || attempt.correctOptionId || null);
          setSelectedOptionId(cached?.selectedOptionId || attempt.selectedOptionId || null);
          setRetryAttemptId(cached?.retryAttemptId || resumeRequest.retryAttemptId || attempt.id || null);
          setStudentAnswer(cached?.studentAnswer || '');
          setResult(cached?.result || null);
          setStep(cached?.result && resumeRequest.feedbackMode !== FEEDBACK_MODES.FINAL ? STEPS.RESULT : STEPS.ANSWER);
          return;
        }

        const analysis = await restoreTopics(resumeRequest.documentId, language);
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
        setQuestionMode(resumeRequest.questionMode || QUESTION_MODES.DESCRIPTIVE);
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
    if (questionCache.current[position]) {
      setCurrentQuestionIndex(position);
      setError(null);
      restoreQuestion(questionCache.current[position]);
      return;
    }
    const planEntry = plan[position];
    const topicId = typeof planEntry === 'string' ? planEntry : planEntry?.topicId;
    const targetQuestionType = (typeof planEntry === 'object' ? planEntry?.questionType : null)
      || (questionMode === QUESTION_MODES.MULTIPLE_CHOICE
        ? QUESTION_TYPES.MULTIPLE_CHOICE
        : QUESTION_TYPES.DESCRIPTIVE);
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
        questionType: targetQuestionType,
        language,
      });
      setActiveTopic(topic);
      setQuestion(data.question);
      setReferenceAnswer(data.reference_answer);
      setQuestionType(data.question_type || targetQuestionType);
      setOptions(data.options || []);
      setCorrectOptionId(data.correct_option_id || null);
      setSelectedOptionId(null);
      setChunkUsed(data.chunk_used);
      setChunkIndex(data.chunk_index);
      setSourceExcerpt(data.source?.excerpt || '');
      setStep(STEPS.ANSWER);
    } catch (requestError) {
      setError(requestError.message);
      setStep(STEPS.QUESTION);
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
    if (isStarting) return;
    const selectedTopics = topics.filter((topic) => selectedTopicIds.includes(topic.id));
    if (!selectedTopics.length || selectedTopics.length > MAX_SESSION_QUESTIONS) return;

    const totalQuestions = Math.max(
      selectedTopics.length,
      Math.min(questionCount, MAX_SESSION_QUESTIONS),
    );
    setIsStarting(true);
    setError(null);
    try {
      const studySession = await createStudySession({
        documentId,
        topicTitles: selectedTopics.map((topic) => topic.title),
        plannedQuestionCount: totalQuestions,
        difficulty,
        questionMode,
        feedbackMode,
        language,
      });
      const plan = createQuestionPlan(selectedTopics, totalQuestions, questionMode);
      questionCache.current = {};
      setStudySessionId(studySession.id);
      setQuestionPlan(plan);
      setSessionResults([]);
      setPendingEdits([]);
      setPersistedSummary(null);
      setSavedSessionContinuation(null);
      await loadQuestion(0, plan);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleSelectedTopicsChange = (topicIds) => {
    setSelectedTopicIds(topicIds);
    if (topicIds.length > 0 && topicIds.length <= MAX_SESSION_QUESTIONS) {
      setQuestionCount((currentCount) => Math.max(topicIds.length, currentCount));
    }
  };

  const prepareSavedSessionContinuation = async () => {
    const analysis = await restoreTopics(documentId, language);
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
    const existingTypesByPosition = Object.fromEntries(
      Object.entries(questionCache.current)
        .filter(([, entry]) => entry?.questionType)
        .map(([position, entry]) => [Number(position), entry.questionType]),
    );
    return {
      topics: restoredTopics,
      plan: createQuestionPlan(restoredTopics, totalQuestions, questionMode, existingTypesByPosition),
      totalQuestions,
    };
  };

  const busy = isGenerating || isEvaluating || isCompleting || isStarting || isRecording;
  const allAnswered = pendingEdits.length === 0 && questionPlan.length > 0 && questionPlan.every(
    (_, position) => sessionResults.some((attempt) => attempt.position === position),
  );

  const finishSession = async () => {
    if (!allAnswered || busy) return;
    setIsCompleting(true);
    setError(null);
    try {
      if (studySessionId) {
        await completeStudySession(studySessionId, language);
        const saved = await getStudySession(studySessionId, language);
        setPersistedSummary(saved);
        setSessionResults(saved.attempts.filter((attempt) => Number.isFinite(attempt.score)).map((attempt) => ({
          position: attempt.question_position - 1,
          topicTitle: attempt.topic_title || '',
          question: attempt.question,
          questionType: attempt.question_type || QUESTION_TYPES.DESCRIPTIVE,
          options: attempt.options || [],
          correctOptionId: attempt.correct_option_id || null,
          selectedOptionId: attempt.selected_option_id || null,
          result: {
            score: attempt.score,
            feedback: attempt.feedback,
            model_answer: attempt.model_answer,
            source: attempt.source_excerpt ? { excerpt: attempt.source_excerpt, page_number: attempt.source_page } : null,
          },
        })));
      }
      setStep(STEPS.SUMMARY);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsCompleting(false);
    }
  };

  const navigateToQuestion = async (position, saveCurrent = true) => {
    if (saveCurrent && busy) return;
    if (saveCurrent && question) questionCache.current[currentQuestionIndex] = snapshotQuestion();
    let plan = questionPlan;
    let topicList = topics;
    if (!questionCache.current[position] && savedSessionContinuation) {
      setIsGenerating(true);
      setError(null);
      try {
        const restored = await prepareSavedSessionContinuation();
        plan = restored.plan;
        topicList = restored.topics;
        setTopics(topicList);
        setSelectedTopicIds(topicList.map((topic) => topic.id));
        setQuestionCount(restored.totalQuestions);
        setQuestionPlan(plan);
        setSavedSessionContinuation(null);
      } catch (requestError) {
        setError(requestError.message);
        setIsGenerating(false);
        return;
      }
    }
    await loadQuestion(position, plan, topicList);
  };

  const advanceSession = async (results = sessionResults, overrides = {}) => {
    questionCache.current[currentQuestionIndex] = snapshotQuestion(overrides);
    const pending = questionPlan.map((_, index) => index).filter(
      (position) => !results.some((attempt) => attempt.position === position),
    );
    const nextIndex = pending.find((position) => position > currentQuestionIndex) ?? pending[0];
    if (nextIndex === undefined) {
      setStep(feedbackMode === FEEDBACK_MODES.IMMEDIATE ? STEPS.RESULT : STEPS.ANSWER);
      return;
    }
    await navigateToQuestion(nextIndex, false);
  };

  const handleSubmitAnswer = async () => {
    const isMultipleChoice = questionType === QUESTION_TYPES.MULTIPLE_CHOICE;
    const hasAnswer = isMultipleChoice ? Boolean(selectedOptionId) : Boolean(studentAnswer.trim());
    if (!hasAnswer || busy || result) return;

    const chosenOption = isMultipleChoice
      ? options.find((opt) => opt.id === selectedOptionId)
      : null;
    const submittedAnswerText = isMultipleChoice
      ? (chosenOption ? `${chosenOption.id}) ${chosenOption.text}` : selectedOptionId)
      : studentAnswer.trim();

    setIsEvaluating(true);
    setError(null);
    try {
      const evaluation = await evaluateAnswer({
        question,
        referenceAnswer,
        studentAnswer: submittedAnswerText,
        audioBlob: isMultipleChoice ? null : audioBlob,
        documentId,
        chunkIndex,
        sourceExcerpt,
        studySessionId,
        topicTitle: activeTopic?.title || null,
        questionPosition: currentQuestionIndex + 1,
        retryAttemptId,
        difficulty,
        questionType,
        options: isMultipleChoice ? options : [],
        correctOptionId: isMultipleChoice ? correctOptionId : null,
        selectedOptionId: isMultipleChoice ? selectedOptionId : null,
        language,
      });
      const attempt = {
        position: currentQuestionIndex,
        topicTitle: activeTopic?.title || '',
        question,
        questionType,
        options,
        correctOptionId,
        selectedOptionId,
        result: evaluation,
      };
      const results = [...sessionResults.filter((item) => item.position !== currentQuestionIndex), attempt]
        .sort((a, b) => a.position - b.position);
      const attemptId = evaluation.attempt_id || retryAttemptId;
      setSessionResults(results);
      setPendingEdits((positions) => positions.filter((position) => position !== currentQuestionIndex));
      setRetryAttemptId(attemptId);
      setStudentAnswer(submittedAnswerText);
      setResult(evaluation);
      questionCache.current[currentQuestionIndex] = snapshotQuestion({
        studentAnswer: submittedAnswerText,
        result: evaluation,
        retryAttemptId: attemptId,
      });

      if (feedbackMode === FEEDBACK_MODES.IMMEDIATE) {
        setStep(STEPS.RESULT);
      } else {
        await advanceSession(results, {
          studentAnswer: submittedAnswerText,
          result: evaluation,
          retryAttemptId: attemptId,
        });
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleConfigureAgain = () => {
    if (busy) return;
    questionCache.current = {};
    resetQuestionState();
    setStudySessionId(null);
    setQuestionPlan([]);
    setCurrentQuestionIndex(0);
    setSessionResults([]);
    setPendingEdits([]);
    setPersistedSummary(null);
    setSavedSessionContinuation(null);
    setError(null);
    setStep(STEPS.SETUP);
  };

  const handleReset = () => {
    if (busy) return;
    questionCache.current = {};
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
    setPendingEdits([]);
    setPersistedSummary(null);
    setSavedSessionContinuation(null);
    setError(null);
    setStep(STEPS.UPLOAD);
  };

  const handleRetryQuestion = () => {
    if (busy) return;
    setPendingEdits((positions) => [...new Set([...positions, currentQuestionIndex])]);
    setResult(null);
    setStep(STEPS.ANSWER);
  };

  const handleAnotherQuestionSameTopic = async () => {
    if (busy || !activeTopic) return;
    // Never replace a question the student has already visited or drafted.
    const nextPosition = questionPlan.findIndex((_, index) => index !== currentQuestionIndex
      && !questionCache.current[index] && !sessionResults.some((item) => item.position === index));
    if (nextPosition < 0 || savedSessionContinuation || !topics.some((topic) => topic.id === activeTopic.id)) {
      await advanceSession();
      return;
    }
    questionCache.current[currentQuestionIndex] = snapshotQuestion();
    const adjustedPlan = questionPlan.map((entry, index) => (
      index === nextPosition
        ? (typeof entry === 'string' ? activeTopic.id : { ...entry, topicId: activeTopic.id })
        : entry
    ));
    setQuestionPlan(adjustedPlan);
    await loadQuestion(nextPosition, adjustedPlan);
  };

  const averageScore = persistedSummary?.average_score ?? null;

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
            disabled={busy}
            className="text-xs text-text-3 hover:text-text-2 transition-colors flex items-center gap-1 shrink-0 ml-2"
          >
            <RotateCcw className="w-3 h-3" />
            {copy.home.changeDocument}
          </button>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-lg border border-danger/30 bg-danger-muted/10 text-sm text-danger">
          {translateErrorMessage(error, language)}
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
        <fieldset disabled={isStarting}>
        <StudySetup
          topics={topics}
          selectedTopicIds={selectedTopicIds}
          onSelectedTopicsChange={handleSelectedTopicsChange}
          questionCount={questionCount}
          onQuestionCountChange={setQuestionCount}
          maxQuestions={MAX_SESSION_QUESTIONS}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          questionMode={questionMode}
          onQuestionModeChange={setQuestionMode}
          feedbackMode={feedbackMode}
          onFeedbackModeChange={setFeedbackMode}
          onStart={handleStartSession}
          language={language}
        />
        </fieldset>
      )}

      {[STEPS.QUESTION, STEPS.ANSWER, STEPS.RESULT].includes(step) && questionPlan.length > 0 && (
        <section className="card p-4 space-y-3">
          <p className="text-sm text-text-2">{copy.home.navigationHint}</p>
          <nav className="flex flex-wrap gap-2" aria-label={copy.home.questionNavigation}>
            {questionPlan.map((_, index) => {
              const answered = sessionResults.some((attempt) => attempt.position === index);
              return <button key={index} type="button" disabled={busy}
                aria-current={index === currentQuestionIndex ? 'step' : undefined}
                aria-label={copy.home.questionNumber.replace('{number}', index + 1) + ' — ' + (answered ? copy.home.answered : copy.home.pending)}
                onClick={() => navigateToQuestion(index)}
                className={['rounded-lg border px-3 py-2 text-sm disabled:opacity-50', index === currentQuestionIndex ? 'border-teal-400 ring-2 ring-teal-400/30' : 'border-border-subtle', answered ? 'bg-teal-500/15 text-teal-400' : 'text-text-2'].join(' ')}>
                {index + 1}{answered ? ' ✓' : ''}
              </button>;
            })}
          </nav>
          {allAnswered && <button id="finish-session-btn" type="button" disabled={busy} onClick={finishSession} className="btn-primary w-full">
            {isCompleting && <span className="spinner" />}{copy.home.finishSession}<BarChart3 className="w-4 h-4" />
          </button>}
          {isRecording && <p role="status" className="text-xs text-text-3">{copy.home.stopBeforeNavigation}</p>}
          {step === STEPS.QUESTION && !isGenerating && error && <button type="button" className="btn-secondary w-full" onClick={() => navigateToQuestion(currentQuestionIndex)}>{copy.home.retryLoad}</button>}
        </section>
      )}

      {(step === STEPS.QUESTION || isGenerating) && !question && !error && (
        <QuestionCard question="" isLoading language={language} />
      )}

      {step === STEPS.ANSWER && !isGenerating && (
        <div className="space-y-4 animate-enter">
          <QuestionCard
            question={question}
            questionType={questionType}
            chunkUsed={chunkUsed}
            isLoading={false}
            language={language}
          />

          {activeTopic && (
            <p className="text-xs text-text-3 px-1">
              {copy.home.currentTopic.replace('{topic}', activeTopic.title)}
            </p>
          )}

          {questionType === QUESTION_TYPES.MULTIPLE_CHOICE ? (
            <div className="space-y-4">
              <MultipleChoiceOptions
                key={currentQuestionIndex}
                name={`mc-question-${currentQuestionIndex}`}
                options={options}
                selectedOptionId={selectedOptionId}
                onSelect={setSelectedOptionId}
                disabled={isEvaluating || Boolean(result)}
                language={language}
              />
              <button
                id="submit-mc-answer-btn"
                type="button"
                onClick={handleSubmitAnswer}
                disabled={!selectedOptionId || busy || Boolean(result)}
                className="btn-primary w-full"
              >
                {isEvaluating ? <><span className="spinner" />{copy.home.evaluating}</> : <>{copy.home.submitAnswer}<Send className="w-4 h-4" /></>}
              </button>
              {result && <button type="button" onClick={handleRetryQuestion} disabled={busy} className="btn-secondary w-full">{copy.home.editAnswer}</button>}
            </div>
          ) : (
            <div className="space-y-4">
              <AudioRecorder
                key={currentQuestionIndex}
                savedAudioBlob={audioBlob}
                onRecordingStatusChange={setIsRecording}
                onRecordingComplete={setAudioBlob}
                onRecordingReset={() => {
                  setAudioBlob(null);
                  setStudentAnswer('');
                }}
                transcriptValue={studentAnswer}
                onTranscriptChange={setStudentAnswer}
                disabled={isEvaluating || Boolean(result)}
                language={language}
              />
              <button
                id="submit-audio-answer-btn"
                type="button"
                onClick={handleSubmitAnswer}
                disabled={!studentAnswer.trim() || busy || Boolean(result)}
                className="btn-primary w-full"
              >
                {isEvaluating ? <><span className="spinner" />{copy.home.evaluating}</> : <>{copy.home.submitVoiceAnswer}<Send className="w-4 h-4" /></>}
              </button>
              {result && <button type="button" onClick={handleRetryQuestion} disabled={busy} className="btn-secondary w-full">{copy.home.editAnswer}</button>}
            </div>
          )}
        </div>
      )}

      {step === STEPS.RESULT && result && (
        <div className="space-y-4">
          <ResultCard
            key={currentQuestionIndex}
            disabled={busy}
            score={result.score}
            feedback={result.feedback}
            modelAnswer={result.model_answer}
            question={question}
            questionType={questionType}
            options={options}
            selectedOptionId={selectedOptionId}
            correctOptionId={correctOptionId}
            source={result.source}
            onRetryQuestion={handleRetryQuestion}
            onAnotherQuestionSameTopic={handleAnotherQuestionSameTopic}
            onContinue={allAnswered ? finishSession : () => advanceSession()}
            isLastQuestion={allAnswered}
            language={language}
          />
          <button id="configure-session-btn" type="button" onClick={handleConfigureAgain} disabled={busy} className="btn-secondary w-full">
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
              <span className="text-4xl font-['Plus_Jakarta_Sans'] font-800 text-teal-400">{averageScore === null ? copy.layout.studyHistoryNoScore : formatScore(averageScore, language)}</span>
              <span className="text-sm text-text-3 mb-1">{copy.home.averageScore}</span>
            </div>
          </div>

          <div className="space-y-2">
            {legacyScoreNotice(persistedSummary, language) && <p role="status">{legacyScoreNotice(persistedSummary, language)}</p>}
            {sessionResults.map((attempt, index) => (
              <details key={`${attempt.question}-${index}`} className="card group">
                <summary className="p-4 cursor-pointer list-none flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-600 text-text-1 truncate">
                      {copy.home.questionNumber.replace('{number}', attempt.position + 1)} · {attempt.topicTitle}
                    </span>
                    <span className="block text-xs text-text-3 mt-1 truncate">{attempt.question}</span>
                  </span>
                  <span className="text-sm font-700 text-teal-400 shrink-0">{attempt.result.score.toFixed(1)}</span>
                </summary>
                <div className="px-4 pb-4 border-t border-border-subtle pt-4 space-y-3">
                  {attempt.questionType === QUESTION_TYPES.MULTIPLE_CHOICE && attempt.options?.length > 0 && (
                    <div>
                      <p className="text-xs font-600 text-teal-400 mb-2">{copy.multipleChoice.optionsReview}</p>
                      <MultipleChoiceOptions
                        options={attempt.options}
                        selectedOptionId={attempt.selectedOptionId}
                        correctOptionId={attempt.correctOptionId}
                        disabled
                        language={language}
                      />
                    </div>
                  )}
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
