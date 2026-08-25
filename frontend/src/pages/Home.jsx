/**
 * Home — Página principal do vetQz.
 *
 * Fluxo do aluno:
 * 1. Upload de PDF → processa e extrai chunks
 * 2. Gera pergunta → exibe QuestionCard
 * 3. Grava áudio OU digita resposta → envia para avaliação
 * 4. Exibe resultado → ResultCard com score, feedback, resposta exemplar
 */

import { useState } from 'react';
import {
  Upload,
  Sparkles,
  MessageSquare,
  ArrowRight,
  RotateCcw,
  Send,
  BookOpen,
} from 'lucide-react';

import PdfUpload from '../components/PdfUpload';
import QuestionCard from '../components/QuestionCard';
import AudioRecorder from '../components/AudioRecorder';
import ResultCard from '../components/ResultCard';

import { uploadPdf, generateQuestion, evaluateAnswer } from '../lib/api';

// Steps do fluxo
const STEPS = {
  UPLOAD: 'upload',
  QUESTION: 'question',
  ANSWER: 'answer',
  RESULT: 'result',
};

export default function Home() {
  // Flow state
  const [step, setStep] = useState(STEPS.UPLOAD);

  // Document state
  const [documentId, setDocumentId] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [totalChunks, setTotalChunks] = useState(0);

  // Question state
  const [question, setQuestion] = useState('');
  const [referenceAnswer, setReferenceAnswer] = useState('');
  const [chunkUsed, setChunkUsed] = useState('');

  // Answer state
  const [studentAnswer, setStudentAnswer] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [answerMode, setAnswerMode] = useState('text'); // 'text' | 'audio'

  // Result state
  const [result, setResult] = useState(null);

  // Loading states
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Error state
  const [error, setError] = useState(null);

  // ─── HANDLERS ─────────────────────────────────────────────

  const handleUpload = async (file) => {
    setIsUploading(true);
    setError(null);
    try {
      const data = await uploadPdf(file);
      setDocumentId(data.document_id);
      setDocumentName(data.filename);
      setTotalChunks(data.chunks.length);
      setStep(STEPS.QUESTION);
      // Auto-generate first question
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
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!studentAnswer.trim() && !audioBlob) return;

    setIsEvaluating(true);
    setError(null);
    try {
      const data = await evaluateAnswer({
        question,
        referenceAnswer,
        studentAnswer: studentAnswer.trim(),
        audioBlob,
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
    setResult(null);
    setError(null);
  };

  const handleNextQuestion = () => {
    setResult(null);
    setStudentAnswer('');
    setAudioBlob(null);
    handleGenerateQuestion();
  };

  // ─── STEP INDICATOR ──────────────────────────────────────

  const stepLabels = [
    { key: STEPS.UPLOAD, label: 'Upload', icon: Upload },
    { key: STEPS.QUESTION, label: 'Pergunta', icon: Sparkles },
    { key: STEPS.ANSWER, label: 'Resposta', icon: MessageSquare },
    { key: STEPS.RESULT, label: 'Resultado', icon: BookOpen },
  ];

  const currentStepIndex = stepLabels.findIndex((s) => s.key === step);

  // ─── RENDER ───────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-between px-2">
        {stepLabels.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === currentStepIndex;
          const isCompleted = i < currentStepIndex;

          return (
            <div key={s.key} className="flex items-center gap-1">
              <div
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                  transition-all duration-300
                  ${isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : isCompleted
                      ? 'bg-emerald-500/10 text-emerald-500/70'
                      : 'bg-bg-glass text-text-muted border border-border-glass'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < stepLabels.length - 1 && (
                <ArrowRight className={`w-3 h-3 mx-1 ${i < currentStepIndex ? 'text-emerald-500/50' : 'text-text-muted/30'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Document info bar */}
      {documentId && step !== STEPS.UPLOAD && (
        <div className="glass-card px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span className="truncate max-w-xs">{documentName}</span>
            <span className="text-text-muted">•</span>
            <span className="text-text-muted">{totalChunks} trechos</span>
          </div>
          <button
            id="reset-btn"
            onClick={handleReset}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Novo PDF
          </button>
        </div>
      )}

      {/* Global error */}
      {error && (
        <div className="glass-card px-4 py-3 border border-danger/30 bg-danger/5 text-sm text-danger flex items-start gap-2 rounded-xl">
          <span className="shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* ─── STEP: UPLOAD ──────────────────────────────── */}
      {step === STEPS.UPLOAD && (
        <div className="glass-card p-6">
          <PdfUpload onUpload={handleUpload} isUploading={isUploading} />
        </div>
      )}

      {/* ─── STEP: QUESTION (loading) ─────────────────── */}
      {(step === STEPS.QUESTION || isGenerating) && (
        <QuestionCard
          question={question}
          chunkUsed={chunkUsed}
          onNewQuestion={() => handleGenerateQuestion()}
          isLoading={isGenerating}
        />
      )}

      {/* ─── STEP: ANSWER ─────────────────────────────── */}
      {step === STEPS.ANSWER && !isGenerating && (
        <div className="space-y-4 animate-slide-up">
          {/* Question display */}
          <QuestionCard
            question={question}
            chunkUsed={chunkUsed}
            onNewQuestion={() => handleGenerateQuestion()}
            isLoading={false}
          />

          {/* Answer mode toggle */}
          <div className="flex gap-2">
            <button
              id="mode-text-btn"
              onClick={() => setAnswerMode('text')}
              className={`
                flex-1 py-2.5 rounded-xl text-sm font-medium transition-all
                ${answerMode === 'text'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-bg-glass text-text-secondary border border-border-glass hover:bg-white/5'
                }
              `}
            >
              ✍️ Digitar resposta
            </button>
            <button
              id="mode-audio-btn"
              onClick={() => setAnswerMode('audio')}
              className={`
                flex-1 py-2.5 rounded-xl text-sm font-medium transition-all
                ${answerMode === 'audio'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-bg-glass text-text-secondary border border-border-glass hover:bg-white/5'
                }
              `}
            >
              🎙️ Gravar áudio
            </button>
          </div>

          {/* Text answer */}
          {answerMode === 'text' && (
            <div className="glass-card p-6 space-y-4">
              <textarea
                id="student-answer-input"
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                placeholder="Digite sua resposta aqui... Seja o mais completo possível."
                rows={5}
                className="w-full bg-bg-glass border border-border-glass rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 transition-all"
              />

              <button
                id="submit-text-answer-btn"
                onClick={handleSubmitAnswer}
                disabled={!studentAnswer.trim() || isEvaluating}
                className={`
                  w-full py-3 rounded-xl font-semibold text-white
                  flex items-center justify-center gap-2
                  transition-all duration-300
                  ${!studentAnswer.trim() || isEvaluating
                    ? 'bg-emerald-600/30 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98]'
                  }
                `}
              >
                {isEvaluating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Avaliando com IA...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar para Avaliação
                  </>
                )}
              </button>
            </div>
          )}

          {/* Audio answer */}
          {answerMode === 'audio' && (
            <div className="space-y-4">
              <AudioRecorder
                onRecordingComplete={(blob) => setAudioBlob(blob)}
                disabled={isEvaluating}
              />

              {/* Text fallback for audio mode (MVP: audio + text required) */}
              <div className="glass-card p-4">
                <p className="text-xs text-text-muted mb-2">
                  📝 No MVP, digite também a resposta para a IA avaliar:
                </p>
                <textarea
                  id="student-answer-audio-fallback"
                  value={studentAnswer}
                  onChange={(e) => setStudentAnswer(e.target.value)}
                  placeholder="Digite a mesma resposta que gravou..."
                  rows={3}
                  className="w-full bg-bg-glass border border-border-glass rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 transition-all"
                />
              </div>

              <button
                id="submit-audio-answer-btn"
                onClick={handleSubmitAnswer}
                disabled={!studentAnswer.trim() || isEvaluating}
                className={`
                  w-full py-3 rounded-xl font-semibold text-white
                  flex items-center justify-center gap-2
                  transition-all duration-300
                  ${!studentAnswer.trim() || isEvaluating
                    ? 'bg-emerald-600/30 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98]'
                  }
                `}
              >
                {isEvaluating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Avaliando com IA...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar para Avaliação
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── STEP: RESULT ──────────────────────────────── */}
      {step === STEPS.RESULT && result && (
        <div className="space-y-4">
          <ResultCard
            score={result.score}
            feedback={result.feedback}
            modelAnswer={result.model_answer}
          />

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              id="next-question-btn"
              onClick={handleNextQuestion}
              className="flex-1 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Próxima Pergunta
            </button>
            <button
              id="new-pdf-btn"
              onClick={handleReset}
              className="py-3 px-6 rounded-xl font-semibold text-text-secondary bg-bg-glass border border-border-glass hover:bg-white/10 transition-all flex items-center gap-2"
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
