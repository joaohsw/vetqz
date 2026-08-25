/**
 * Home — Main page orchestrating the quiz flow.
 *
 * 4-step flow: Upload → Question → Answer → Result
 * No emoji. Icon-driven step indicator. Design system classes throughout.
 */

import { useState } from 'react';
import {
  Upload,
  Zap,
  MessageSquare,
  BarChart3,
  ArrowRight,
  RotateCcw,
  Send,
  FileText,
  Mic,
  PenLine,
} from 'lucide-react';

import PdfUpload from '../components/PdfUpload';
import QuestionCard from '../components/QuestionCard';
import AudioRecorder from '../components/AudioRecorder';
import ResultCard from '../components/ResultCard';

import { uploadPdf, generateQuestion, evaluateAnswer } from '../lib/api';

const STEPS = {
  UPLOAD: 'upload',
  QUESTION: 'question',
  ANSWER: 'answer',
  RESULT: 'result',
};

export default function Home() {
  const [step, setStep] = useState(STEPS.UPLOAD);

  // Document
  const [documentId, setDocumentId] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [totalChunks, setTotalChunks] = useState(0);

  // Question
  const [question, setQuestion] = useState('');
  const [referenceAnswer, setReferenceAnswer] = useState('');
  const [chunkUsed, setChunkUsed] = useState('');

  // Answer
  const [studentAnswer, setStudentAnswer] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [answerMode, setAnswerMode] = useState('audio');

  // Result
  const [result, setResult] = useState(null);

  // Loading
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Error
  const [error, setError] = useState(null);

  // ── Handlers ──

  const handleUpload = async (file) => {
    setIsUploading(true);
    setError(null);
    try {
      const data = await uploadPdf(file);
      setDocumentId(data.document_id);
      setDocumentName(data.filename);
      setTotalChunks(data.chunks.length);
      setStep(STEPS.QUESTION);
      await handleGenerateQuestion(data.document_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateQuestion = async (docId = documentId) => {
    setIsGenerating(true);
    setError(null);
    setResult(null);
    try {
      const data = await generateQuestion(docId);
      setQuestion(data.question);
      setReferenceAnswer(data.reference_answer);
      setChunkUsed(data.chunk_used);
      setStep(STEPS.ANSWER);
      setStudentAnswer('');
      setAudioBlob(null);
      setAnswerMode('audio');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!studentAnswer.trim()) return;
    setIsEvaluating(true);
    setError(null);
    try {
      const data = await evaluateAnswer({
        question,
        referenceAnswer,
        studentAnswer: studentAnswer.trim(),
        audioBlob: answerMode === 'audio' ? audioBlob : null,
      });
      setResult(data);
      setStep(STEPS.RESULT);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleReset = () => {
    setStep(STEPS.UPLOAD);
    setDocumentId(null);
    setDocumentName('');
    setTotalChunks(0);
    setQuestion('');
    setReferenceAnswer('');
    setChunkUsed('');
    setStudentAnswer('');
    setAudioBlob(null);
    setAnswerMode('audio');
    setResult(null);
    setError(null);
  };

  const handleNextQuestion = () => {
    setResult(null);
    setStudentAnswer('');
    setAudioBlob(null);
    handleGenerateQuestion();
  };

  const handleAnswerModeChange = (mode) => {
    if (mode === answerMode) return;
    setAnswerMode(mode);
    setStudentAnswer('');
    setAudioBlob(null);
  };

  // ── Step indicator config ──

  const steps = [
    { key: STEPS.UPLOAD, label: 'Upload', icon: Upload },
    { key: STEPS.QUESTION, label: 'Pergunta', icon: Zap },
    { key: STEPS.ANSWER, label: 'Resposta', icon: MessageSquare },
    { key: STEPS.RESULT, label: 'Resultado', icon: BarChart3 },
  ];

  const currentIndex = steps.findIndex((s) => s.key === step);

  // ── Render ──

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step indicator */}
      <nav className="flex items-center gap-1" aria-label="Progresso">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === currentIndex;
          const isDone = i < currentIndex;

          return (
            <div key={s.key} className="flex items-center gap-1">
              <div
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-500
                  transition-all duration-200
                  ${isActive
                    ? 'bg-teal-500/15 text-teal-400'
                    : isDone
                      ? 'text-teal-400/60'
                      : 'text-text-3'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className={`w-3 h-3 ${isDone ? 'text-teal-400/40' : 'text-border-subtle'}`} />
              )}
            </div>
          );
        })}
      </nav>

      {/* Document info */}
      {documentId && step !== STEPS.UPLOAD && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-surface-1 border border-border-subtle text-sm">
          <div className="flex items-center gap-2 text-text-2 min-w-0">
            <FileText className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="truncate">{documentName}</span>
            <span className="text-text-3 shrink-0">{totalChunks} trechos</span>
          </div>
          <button
            id="reset-btn"
            onClick={handleReset}
            className="text-xs text-text-3 hover:text-text-2 transition-colors flex items-center gap-1 shrink-0 ml-2"
          >
            <RotateCcw className="w-3 h-3" />
            Trocar
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg border border-danger/30 bg-danger-muted/10 text-sm text-danger">
          {error}
        </div>
      )}

      {/* ── UPLOAD ── */}
      {step === STEPS.UPLOAD && (
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-['Plus_Jakarta_Sans'] font-800 tracking-tight text-text-1">
              Comece pelo material
            </h2>
            <p className="text-sm text-text-3 mt-1">
              Envie um PDF de Anatomia Veterinária para gerar perguntas.
            </p>
          </div>
          <PdfUpload onUpload={handleUpload} isUploading={isUploading} />
        </section>
      )}

      {/* ── QUESTION (loading) ── */}
      {(step === STEPS.QUESTION || isGenerating) && !question && (
        <QuestionCard question="" isLoading={true} />
      )}

      {/* ── ANSWER ── */}
      {step === STEPS.ANSWER && !isGenerating && (
        <div className="space-y-4 animate-enter">
          <QuestionCard
            question={question}
            chunkUsed={chunkUsed}
            onNewQuestion={() => handleGenerateQuestion()}
            isLoading={false}
          />

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              id="mode-audio-btn"
              onClick={() => handleAnswerModeChange('audio')}
              className={`
                flex-1 py-2.5 rounded-lg text-sm font-500 transition-all duration-200 flex items-center justify-center gap-2
                ${answerMode === 'audio'
                  ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                  : 'bg-surface-1 text-text-3 border border-border-subtle hover:text-text-2'
                }
              `}
            >
              <Mic className="w-3.5 h-3.5" />
              Responder por voz
            </button>
            <button
              id="mode-text-btn"
              onClick={() => handleAnswerModeChange('text')}
              className={`
                flex-1 py-2.5 rounded-lg text-sm font-500 transition-all duration-200 flex items-center justify-center gap-2
                ${answerMode === 'text'
                  ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                  : 'bg-surface-1 text-text-3 border border-border-subtle hover:text-text-2'
                }
              `}
            >
              <PenLine className="w-3.5 h-3.5" />
              Digitar (alternativa)
            </button>
          </div>

          {/* Text mode */}
          {answerMode === 'text' && (
            <div className="card p-6 space-y-4">
              <textarea
                id="student-answer-input"
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                placeholder="Digite sua resposta. Seja o mais completo possível."
                rows={5}
                className="input-field"
              />
              <button
                id="submit-text-answer-btn"
                onClick={handleSubmitAnswer}
                disabled={!studentAnswer.trim() || isEvaluating}
                className="btn-primary w-full"
              >
                {isEvaluating ? (
                  <>
                    <span className="spinner" />
                    Avaliando...
                  </>
                ) : (
                  <>
                    Enviar resposta
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Audio mode */}
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
              />

              <button
                id="submit-audio-answer-btn"
                onClick={handleSubmitAnswer}
                disabled={!audioBlob || !studentAnswer.trim() || isEvaluating}
                className="btn-primary w-full"
              >
                {isEvaluating ? (
                  <>
                    <span className="spinner" />
                    Avaliando...
                  </>
                ) : (
                  <>
                    Enviar resposta por voz
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── RESULT ── */}
      {step === STEPS.RESULT && result && (
        <div className="space-y-4">
          <ResultCard
            score={result.score}
            feedback={result.feedback}
            modelAnswer={result.model_answer}
          />

          <div className="flex gap-3 pt-2">
            <button
              id="next-question-btn"
              onClick={handleNextQuestion}
              className="btn-primary flex-1"
            >
              <Zap className="w-4 h-4" />
              Próxima pergunta
            </button>
            <button
              id="new-pdf-btn"
              onClick={handleReset}
              className="btn-secondary"
            >
              <RotateCcw className="w-4 h-4" />
              Novo PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
