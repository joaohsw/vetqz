/**
 * Home — orchestrates upload, study setup, question session, and review.
 */

import { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  FileText,
  ListTree,
  MessageSquare,
  Mic,
  PenLine,
  RotateCcw,
  Send,
  Upload,
  Zap,
} from 'lucide-react';

import AudioRecorder from '../components/AudioRecorder';
import PdfUpload from '../components/PdfUpload';
import QuestionCard from '../components/QuestionCard';
import ResultCard from '../components/ResultCard';
import StudySetup from '../components/StudySetup';
import { analyzeTopics, evaluateAnswer, generateQuestion, uploadPdf } from '../lib/api';
import { getTranslations } from '../i18n';

const STEPS = {
  UPLOAD: 'upload',
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

const MAX_SESSION_QUESTIONS = 20;

function createQuestionPlan(selectedTopics, questionCount) {
  return Array.from(
    { length: questionCount },
    (_, index) => selectedTopics[index % selectedTopics.length].id,
  );
}

export default function Home({ language }) {
  const copy = getTranslations(language);
  const [step, setStep] = useState(STEPS.UPLOAD);

  // Document and generated study map
  const [documentId, setDocumentId] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [totalChunks, setTotalChunks] = useState(0);
  const [topics, setTopics] = useState([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState([]);

  // Session preferences and progress
  const [questionCount, setQuestionCount] = useState(1);
  const [feedbackMode, setFeedbackMode] = useState(FEEDBACK_MODES.IMMEDIATE);
  const [questionPlan, setQuestionPlan] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sessionResults, setSessionResults] = useState([]);

  // Active question
  const [activeTopic, setActiveTopic] = useState(null);
  const [question, setQuestion] = useState('');
  const [referenceAnswer, setReferenceAnswer] = useState('');
  const [chunkUsed, setChunkUsed] = useState('');

  // Answer and result
  const [studentAnswer, setStudentAnswer] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [answerMode, setAnswerMode] = useState('audio');
  const [result, setResult] = useState(null);

  // UI state
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState(null);

  const progressSteps = [
    { key: STEPS.UPLOAD, label: copy.home.steps.upload, icon: Upload },
    { key: STEPS.SETUP, label: copy.home.steps.setup, icon: ListTree },
    { key: STEPS.ANSWER, label: copy.home.steps.answer, icon: MessageSquare },
    { key: STEPS.SUMMARY, label: copy.home.steps.summary, icon: BarChart3 },
  ];
  const progressKey = [STEPS.QUESTION, STEPS.ANSWER, STEPS.RESULT].includes(step)
    ? STEPS.ANSWER
    : step;
  const currentProgressIndex = progressSteps.findIndex((item) => item.key === progressKey);

  const resetQuestionState = () => {
    setActiveTopic(null);
    setQuestion('');
    setReferenceAnswer('');
    setChunkUsed('');
    setStudentAnswer('');
    setAudioBlob(null);
    setAnswerMode('audio');
    setResult(null);
  };

  const loadQuestion = async (position, plan = questionPlan) => {
    const topicId = plan[position];
    const topic = topics.find((item) => item.id === topicId);
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
        language,
      });
      setActiveTopic(topic);
      setQuestion(data.question);
      setReferenceAnswer(data.reference_answer);
      setChunkUsed(data.chunk_used);
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
    setError(null);
    try {
      const upload = await uploadPdf(file, language);
      const analysis = await analyzeTopics(upload.document_id, language);
      setDocumentId(upload.document_id);
      setDocumentName(upload.filename);
      setTotalChunks(upload.chunks.length);
      setTopics(analysis.topics);
      const allTopicIds = analysis.topics.map((topic) => topic.id);
      setSelectedTopicIds(allTopicIds);
      setQuestionCount(Math.min(allTopicIds.length, MAX_SESSION_QUESTIONS));
      setStep(STEPS.SETUP);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartSession = async () => {
    const selectedTopics = topics.filter((topic) => selectedTopicIds.includes(topic.id));
    if (!selectedTopics.length || selectedTopics.length > MAX_SESSION_QUESTIONS) return;

    const totalQuestions = Math.max(
      selectedTopics.length,
      Math.min(questionCount, MAX_SESSION_QUESTIONS),
    );
    const plan = createQuestionPlan(selectedTopics, totalQuestions);
    setQuestionPlan(plan);
    setSessionResults([]);
    await loadQuestion(0, plan);
  };

  const handleSelectedTopicsChange = (topicIds) => {
    setSelectedTopicIds(topicIds);
    if (topicIds.length > 0 && topicIds.length <= MAX_SESSION_QUESTIONS) {
      setQuestionCount((currentCount) => Math.max(topicIds.length, currentCount));
    }
  };

  const advanceSession = async () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= questionPlan.length) {
      setStep(STEPS.SUMMARY);
      return;
    }
    await loadQuestion(nextIndex);
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
        audioBlob: answerMode === 'audio' ? audioBlob : null,
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
    setQuestionPlan([]);
    setCurrentQuestionIndex(0);
    setSessionResults([]);
    setError(null);
    setStep(STEPS.SETUP);
  };

  const handleReset = () => {
    resetQuestionState();
    setDocumentId(null);
    setDocumentName('');
    setTotalChunks(0);
    setTopics([]);
    setSelectedTopicIds([]);
    setQuestionPlan([]);
    setCurrentQuestionIndex(0);
    setSessionResults([]);
    setError(null);
    setStep(STEPS.UPLOAD);
  };

  const handleAnswerModeChange = (mode) => {
    if (mode === answerMode) return;
    setAnswerMode(mode);
    setStudentAnswer('');
    setAudioBlob(null);
  };

  const averageScore = sessionResults.length
    ? sessionResults.reduce((sum, attempt) => sum + attempt.result.score, 0) / sessionResults.length
    : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <nav className="flex items-center gap-1" aria-label={copy.home.progress}>
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

      {documentId && step !== STEPS.UPLOAD && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-surface-1 border border-border-subtle text-sm">
          <div className="flex items-center gap-2 text-text-2 min-w-0">
            <FileText className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="truncate">{documentName}</span>
            <span className="text-text-3 shrink-0">{totalChunks} {copy.home.excerpts}</span>
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
          <PdfUpload onUpload={handleUpload} isUploading={isUploading} language={language} />
        </section>
      )}

      {step === STEPS.SETUP && (
        <StudySetup
          topics={topics}
          selectedTopicIds={selectedTopicIds}
          onSelectedTopicsChange={handleSelectedTopicsChange}
          questionCount={questionCount}
          onQuestionCountChange={setQuestionCount}
          maxQuestions={MAX_SESSION_QUESTIONS}
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

          <div className="flex gap-2">
            <button
              id="mode-audio-btn"
              type="button"
              onClick={() => handleAnswerModeChange('audio')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-500 transition-all duration-200 flex items-center justify-center gap-2 ${
                answerMode === 'audio'
                  ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                  : 'bg-surface-1 text-text-3 border border-border-subtle hover:text-text-2'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              {copy.home.answerByVoice}
            </button>
            <button
              id="mode-text-btn"
              type="button"
              onClick={() => handleAnswerModeChange('text')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-500 transition-all duration-200 flex items-center justify-center gap-2 ${
                answerMode === 'text'
                  ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                  : 'bg-surface-1 text-text-3 border border-border-subtle hover:text-text-2'
              }`}
            >
              <PenLine className="w-3.5 h-3.5" />
              {copy.home.answerByText}
            </button>
          </div>

          {answerMode === 'text' && (
            <div className="card p-6 space-y-4">
              <textarea
                id="student-answer-input"
                value={studentAnswer}
                onChange={(event) => setStudentAnswer(event.target.value)}
                placeholder={copy.home.textPlaceholder}
                rows={5}
                className="input-field"
              />
              <button
                id="submit-text-answer-btn"
                type="button"
                onClick={handleSubmitAnswer}
                disabled={!studentAnswer.trim() || isEvaluating}
                className="btn-primary w-full"
              >
                {isEvaluating ? <><span className="spinner" />{copy.home.evaluating}</> : <>{copy.home.submitAnswer}<Send className="w-4 h-4" /></>}
              </button>
            </div>
          )}

          {answerMode === 'audio' && (
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
                disabled={!audioBlob || !studentAnswer.trim() || isEvaluating}
                className="btn-primary w-full"
              >
                {isEvaluating ? <><span className="spinner" />{copy.home.evaluating}</> : <>{copy.home.submitVoiceAnswer}<Send className="w-4 h-4" /></>}
              </button>
            </div>
          )}
        </div>
      )}

      {step === STEPS.RESULT && result && (
        <div className="space-y-4">
          <ResultCard
            score={result.score}
            feedback={result.feedback}
            modelAnswer={result.model_answer}
            language={language}
          />
          <div className="flex gap-3 pt-2">
            <button id="continue-session-btn" type="button" onClick={advanceSession} className="btn-primary flex-1">
              <Zap className="w-4 h-4" />
              {currentQuestionIndex + 1 >= questionPlan.length ? copy.home.viewSummary : copy.home.nextQuestion}
            </button>
            <button id="configure-session-btn" type="button" onClick={handleConfigureAgain} className="btn-secondary">
              <SlidersIcon />
              {copy.home.configureSession}
            </button>
          </div>
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
                  <p className="text-sm text-text-2 leading-relaxed whitespace-pre-line">{attempt.result.feedback}</p>
                  <details className="text-sm">
                    <summary className="text-teal-400 cursor-pointer">{copy.result.modelAnswer}</summary>
                    <p className="text-text-2 leading-relaxed whitespace-pre-line mt-2">{attempt.result.model_answer}</p>
                  </details>
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
