/**
 * AudioRecorder — Componente de gravação de áudio com estados visuais.
 *
 * Estados: Idle → Gravando (pulsação vermelha) → Pausado → Enviando
 * Usa a MediaRecorder API via useAudioRecorder hook.
 */

import { Mic, MicOff, Pause, Play, Square, Trash2 } from 'lucide-react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

export default function AudioRecorder({ onRecordingComplete, disabled = false }) {
  const {
    status,
    audioBlob,
    audioUrl,
    formattedDuration,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  } = useAudioRecorder();

  const handleDone = () => {
    if (audioBlob && onRecordingComplete) {
      onRecordingComplete(audioBlob);
    }
  };

  return (
    <div className="glass-card p-6 animate-slide-up">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
        <Mic className="w-4 h-4 text-emerald-400" />
        Gravação de Áudio
      </h3>

      {/* Timer display */}
      <div className="text-center mb-6">
        <p className={`
          text-5xl font-light tabular-nums tracking-wide
          ${status === 'recording' ? 'text-danger' : 'text-text-primary'}
          transition-colors duration-300
        `}>
          {formattedDuration}
        </p>
        <p className="text-sm text-text-muted mt-2">
          {status === 'idle' && !audioBlob && 'Pressione para gravar'}
          {status === 'idle' && audioBlob && 'Gravação concluída'}
          {status === 'recording' && 'Gravando...'}
          {status === 'paused' && 'Pausado'}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Idle — no recording yet */}
        {status === 'idle' && !audioBlob && (
          <button
            id="audio-start-btn"
            onClick={startRecording}
            disabled={disabled}
            className={`
              w-16 h-16 rounded-full flex items-center justify-center
              transition-all duration-300
              ${disabled
                ? 'bg-text-muted/30 cursor-not-allowed'
                : 'bg-gradient-to-br from-danger to-red-600 hover:scale-110 hover:shadow-lg hover:shadow-danger/30 active:scale-95'
              }
            `}
          >
            <Mic className="w-7 h-7 text-white" />
          </button>
        )}

        {/* Recording */}
        {status === 'recording' && (
          <>
            <button
              id="audio-pause-btn"
              onClick={pauseRecording}
              className="w-12 h-12 rounded-full bg-bg-glass border border-border-glass flex items-center justify-center hover:bg-white/10 transition-all"
            >
              <Pause className="w-5 h-5 text-text-primary" />
            </button>

            <button
              id="audio-stop-btn"
              onClick={stopRecording}
              className="w-16 h-16 rounded-full bg-danger flex items-center justify-center animate-recording-pulse hover:scale-105 transition-transform"
            >
              <Square className="w-6 h-6 text-white fill-white" />
            </button>
          </>
        )}

        {/* Paused */}
        {status === 'paused' && (
          <>
            <button
              id="audio-resume-btn"
              onClick={resumeRecording}
              className="w-12 h-12 rounded-full bg-bg-glass border border-border-glass flex items-center justify-center hover:bg-white/10 transition-all"
            >
              <Play className="w-5 h-5 text-emerald-400" />
            </button>

            <button
              id="audio-stop-paused-btn"
              onClick={stopRecording}
              className="w-16 h-16 rounded-full bg-danger flex items-center justify-center hover:scale-105 transition-transform"
            >
              <Square className="w-6 h-6 text-white fill-white" />
            </button>
          </>
        )}

        {/* Completed — has recording */}
        {status === 'idle' && audioBlob && (
          <>
            <button
              id="audio-reset-btn"
              onClick={resetRecording}
              className="w-12 h-12 rounded-full bg-bg-glass border border-border-glass flex items-center justify-center hover:bg-white/10 transition-all"
              title="Descartar e regravar"
            >
              <Trash2 className="w-5 h-5 text-text-secondary" />
            </button>

            <button
              id="audio-rerecord-btn"
              onClick={() => {
                resetRecording();
                setTimeout(startRecording, 100);
              }}
              className="w-12 h-12 rounded-full bg-bg-glass border border-border-glass flex items-center justify-center hover:bg-white/10 transition-all"
              title="Regravar"
            >
              <Mic className="w-5 h-5 text-text-primary" />
            </button>
          </>
        )}
      </div>

      {/* Audio playback preview */}
      {audioUrl && status === 'idle' && (
        <div className="mt-5">
          <audio
            id="audio-preview"
            src={audioUrl}
            controls
            className="w-full h-10 rounded-lg"
            style={{ filter: 'invert(1) hue-rotate(180deg) contrast(0.8)' }}
          />
        </div>
      )}

      {/* Use recording button */}
      {audioBlob && status === 'idle' && (
        <button
          id="audio-use-btn"
          onClick={handleDone}
          className="mt-4 w-full py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25 transition-all active:scale-[0.98]"
        >
          Usar esta gravação
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-start gap-2 text-sm text-danger bg-danger/10 rounded-lg px-4 py-3">
          <MicOff className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
