/**
 * AudioRecorder — Audio recording with clear visual states.
 *
 * States: idle → recording (ring pulse) → paused → completed
 * No emoji, proper icon-driven states, quiet motion.
 */

import { useEffect } from 'react';
import { Mic, Pause, Play, Square, RotateCcw, AlertCircle, FileText } from 'lucide-react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

export default function AudioRecorder({
  onRecordingComplete,
  onRecordingReset,
  transcriptValue,
  onTranscriptChange,
  disabled = false,
}) {
  const {
    status,
    audioBlob,
    audioUrl,
    formattedDuration,
    error,
    transcript,
    transcriptionError,
    isSpeechRecognitionSupported,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  } = useAudioRecorder();

  useEffect(() => {
    if (audioBlob) onRecordingComplete?.(audioBlob);
  }, [audioBlob, onRecordingComplete]);

  useEffect(() => {
    onTranscriptChange?.(transcript);
  }, [transcript, onTranscriptChange]);

  const handleReset = () => {
    resetRecording();
    onRecordingReset?.();
  };

  return (
    <div className="card p-6 animate-enter">
      <h3 className="text-xs font-['Plus_Jakarta_Sans'] font-600 text-text-3 uppercase tracking-widest mb-5 flex items-center gap-2">
        <Mic className="w-3.5 h-3.5 text-teal-400" />
        Gravação de Áudio
      </h3>

      {/* Timer */}
      <div className="text-center mb-6">
        <p className={`
          text-5xl font-['Plus_Jakarta_Sans'] font-300 tabular-nums tracking-wider
          transition-colors duration-200
          ${status === 'recording' ? 'text-danger' : 'text-text-1'}
        `}>
          {formattedDuration}
        </p>
        <p className="text-sm text-text-3 mt-2">
          {status === 'idle' && !audioBlob && 'Pressione para iniciar'}
          {status === 'idle' && audioBlob && 'Gravação concluída'}
          {status === 'recording' && 'Gravando'}
          {status === 'paused' && 'Pausado'}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {/* Idle — no recording */}
        {status === 'idle' && !audioBlob && (
          <button
            id="audio-start-btn"
            onClick={startRecording}
            disabled={disabled}
            className={`
              w-14 h-14 rounded-full flex items-center justify-center
              transition-all duration-200
              ${disabled
                ? 'bg-surface-3 text-text-3 cursor-not-allowed'
                : 'bg-danger text-white hover:scale-105 active:scale-95'
              }
            `}
          >
            <Mic className="w-6 h-6" />
          </button>
        )}

        {/* Recording */}
        {status === 'recording' && (
          <>
            <button
              id="audio-pause-btn"
              onClick={pauseRecording}
              className="btn-secondary rounded-full w-10 h-10 p-0"
            >
              <Pause className="w-4 h-4" />
            </button>

            <div className="recording-indicator">
              <button
                id="audio-stop-btn"
                onClick={stopRecording}
                className="w-14 h-14 rounded-full bg-danger text-white flex items-center justify-center hover:scale-105 transition-transform"
              >
                <Square className="w-5 h-5 fill-current" />
              </button>
            </div>
          </>
        )}

        {/* Paused */}
        {status === 'paused' && (
          <>
            <button
              id="audio-resume-btn"
              onClick={resumeRecording}
              className="btn-secondary rounded-full w-10 h-10 p-0"
            >
              <Play className="w-4 h-4 text-teal-400" />
            </button>

            <button
              id="audio-stop-paused-btn"
              onClick={stopRecording}
              className="w-14 h-14 rounded-full bg-danger text-white flex items-center justify-center hover:scale-105 transition-transform"
            >
              <Square className="w-5 h-5 fill-current" />
            </button>
          </>
        )}

        {/* Completed */}
        {status === 'idle' && audioBlob && (
          <button
            id="audio-reset-btn"
            onClick={handleReset}
            className="btn-secondary rounded-full w-10 h-10 p-0"
            title="Descartar e regravar"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Playback */}
      {audioUrl && status === 'idle' && (
        <div className="mt-5 p-3 rounded-lg bg-surface-0">
          <audio
            id="audio-preview"
            src={audioUrl}
            controls
            className="w-full h-8"
            style={{ filter: 'invert(0.85) hue-rotate(180deg) contrast(0.85) saturate(0.5)' }}
          />
        </div>
      )}

      {/* Editable browser-generated transcript */}
      <div className="mt-5">
        <div className="flex items-center justify-between gap-3 mb-2">
          <label
            htmlFor="audio-transcript-input"
            className="text-xs font-['Plus_Jakarta_Sans'] font-600 text-text-2 flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-teal-400" />
            Transcrição editável
          </label>
          {status === 'recording' && (
            <span className="text-xs text-teal-400">Transcrevendo...</span>
          )}
        </div>
        <textarea
          id="audio-transcript-input"
          value={transcriptValue}
          onChange={(event) => onTranscriptChange?.(event.target.value)}
          placeholder={
            isSpeechRecognitionSupported
              ? 'A transcrição aparecerá aqui enquanto você fala...'
              : 'Transcrição automática indisponível. Digite sua resposta aqui.'
          }
          rows={4}
          className="input-field"
        />
        <p className="text-xs text-text-3 mt-2">
          Revise e corrija a transcrição antes de enviar.
        </p>
      </div>

      {!isSpeechRecognitionSupported && (
        <div className="mt-4 flex items-start gap-2 text-sm text-gold-400 bg-gold-500/10 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Seu navegador não oferece transcrição automática. Use Chrome/Edge ou digite a resposta.</span>
        </div>
      )}

      {transcriptionError && (
        <div className="mt-4 flex items-start gap-2 text-sm text-gold-400 bg-gold-500/10 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{transcriptionError} Você ainda pode corrigir ou digitar a resposta.</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-start gap-2 text-sm text-danger bg-danger-muted/20 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
