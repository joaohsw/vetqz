/**
 * AudioRecorder — Audio recording with clear visual states.
 *
 * States: idle → recording (ring pulse) → paused → completed
 * No emoji, proper icon-driven states, quiet motion.
 */

import { useEffect, useRef, useState } from 'react';
import { Mic, Pause, Play, Square, RotateCcw, AlertCircle, FileText, X } from 'lucide-react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { getTranslations } from '../i18n';

/** Formats seconds as mm:ss for the playback bar, tolerating NaN/Infinity before metadata loads. */
function formatPlaybackTime(seconds) {
  if (!Number.isFinite(seconds)) return '00:00';
  const total = Math.floor(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Color variants so each recording action reads as a distinct, legible control. */
const CONTROL_VARIANTS = {
  danger: 'bg-danger text-white hover:brightness-110',
  gold: 'bg-gold-500/15 text-gold-400 border border-gold-500/30 hover:bg-gold-500/25',
  teal: 'bg-teal-500/15 text-teal-400 border border-teal-500/30 hover:bg-teal-500/25',
  dangerOutline: 'bg-danger-muted/15 text-danger border border-danger/30 hover:bg-danger-muted/25',
  disabled: 'bg-surface-3 text-text-3 cursor-not-allowed',
};

/** Icon-in-circle button, color-coded per action — no icon-only "mystery box" controls. */
function ControlButton({ id, icon: Icon, iconClassName = '', label, onClick, variant, size = 'md', disabled = false, pulse = false }) {
  const circleSize = size === 'lg' ? 'w-14 h-14' : 'w-11 h-11';
  const iconSize = size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`
        ${circleSize} rounded-full flex items-center justify-center
        transition-all duration-200
        ${disabled ? '' : 'hover:scale-105 active:scale-95'}
        ${pulse ? 'recording-indicator' : ''}
        ${CONTROL_VARIANTS[disabled ? 'disabled' : variant]}
      `}
    >
      <Icon className={`${iconSize} ${iconClassName}`} />
    </button>
  );
}

export default function AudioRecorder({
  onRecordingComplete,
  onRecordingReset,
  transcriptValue,
  onTranscriptChange,
  disabled = false,
  language,
}) {
  const copy = getTranslations(language);
  const {
    status,
    audioBlob,
    audioUrl,
    duration,
    formattedDuration,
    error,
    transcript,
    transcriptionError,
    isSpeechRecognitionSupported,
    isBrowserLikelySupported,
    recognitionUnavailable,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  } = useAudioRecorder(language);

  const [warningDismissed, setWarningDismissed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const audioElementRef = useRef(null);
  const latestDurationRef = useRef(duration);

  useEffect(() => {
    latestDurationRef.current = duration;
  }, [duration]);

  const browserWarningMessage = !isSpeechRecognitionSupported
    ? copy.audio.unsupported
    : recognitionUnavailable
      ? copy.audio.unreliableBrowser
      : !isBrowserLikelySupported
        ? copy.audio.browserMaybeUnsupported
        : null;

  useEffect(() => {
    setWarningDismissed(false);
  }, [browserWarningMessage]);

  useEffect(() => {
    if (audioBlob) onRecordingComplete?.(audioBlob);
  }, [audioBlob, onRecordingComplete]);

  useEffect(() => {
    onTranscriptChange?.(transcript);
  }, [transcript, onTranscriptChange]);

  useEffect(() => {
    setIsPlaying(false);
    setPlaybackTime(0);
    // Seed with the recorder's own tracked length — Chrome reports Infinity for
    // MediaRecorder blob URLs' duration metadata until a seek past the end occurs.
    setPlaybackDuration(latestDurationRef.current);
  }, [audioUrl]);

  const handleReset = () => {
    resetRecording();
    onRecordingReset?.();
  };

  const togglePlayback = () => {
    const audioElement = audioElementRef.current;
    if (!audioElement) return;
    if (audioElement.paused) {
      audioElement.play();
    } else {
      audioElement.pause();
    }
  };

  const handleSeek = (event) => {
    const audioElement = audioElementRef.current;
    if (!audioElement || !playbackDuration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    audioElement.currentTime = ratio * playbackDuration;
    setPlaybackTime(audioElement.currentTime);
  };

  return (
    <div className="card p-6 animate-enter">
      <h3 className="text-xs font-['Plus_Jakarta_Sans'] font-600 text-text-3 uppercase tracking-widest mb-5 flex items-center gap-2">
        <Mic className="w-3.5 h-3.5 text-teal-400" />
        {copy.audio.title}
      </h3>

      {browserWarningMessage && !warningDismissed && (
        <div className="relative mb-5 flex items-start gap-2 text-sm text-gold-400 bg-gold-500/10 rounded-lg pl-4 pr-9 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{browserWarningMessage}</span>
          <button
            type="button"
            onClick={() => setWarningDismissed(true)}
            aria-label={copy.audio.dismissWarning}
            className="absolute top-2 right-2 p-1 rounded-md text-gold-400/70 hover:text-gold-400 hover:bg-gold-500/10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
          {status === 'idle' && !audioBlob && copy.audio.startPrompt}
          {status === 'idle' && audioBlob && copy.audio.completed}
          {status === 'recording' && copy.audio.recording}
          {status === 'paused' && copy.audio.paused}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-5">
        {/* Idle — no recording */}
        {status === 'idle' && !audioBlob && (
          <ControlButton
            id="audio-start-btn"
            icon={Mic}
            label={copy.audio.start}
            onClick={startRecording}
            disabled={disabled}
            variant="danger"
            size="lg"
          />
        )}

        {/* Recording */}
        {status === 'recording' && (
          <>
            <ControlButton
              id="audio-pause-btn"
              icon={Pause}
              label={copy.audio.pause}
              onClick={pauseRecording}
              variant="gold"
            />

            <ControlButton
              id="audio-stop-btn"
              icon={Square}
              iconClassName="fill-current"
              label={copy.audio.stop}
              onClick={stopRecording}
              variant="danger"
              size="lg"
              pulse
            />
          </>
        )}

        {/* Paused */}
        {status === 'paused' && (
          <>
            <ControlButton
              id="audio-resume-btn"
              icon={Play}
              label={copy.audio.resume}
              onClick={resumeRecording}
              variant="teal"
            />

            <ControlButton
              id="audio-stop-paused-btn"
              icon={Square}
              iconClassName="fill-current"
              label={copy.audio.stop}
              onClick={stopRecording}
              variant="danger"
              size="lg"
            />
          </>
        )}

        {/* Completed */}
        {status === 'idle' && audioBlob && (
          <ControlButton
            id="audio-reset-btn"
            icon={RotateCcw}
            label={copy.audio.discard}
            onClick={handleReset}
            variant="dangerOutline"
          />
        )}
      </div>

      {/* Playback — custom bar synced to timeupdate; native controls' progress
          glitched when combined with the dark-mode invert filter. */}
      {audioUrl && status === 'idle' && (
        <div className="mt-5 p-3 rounded-lg bg-surface-0 flex items-center gap-3">
          <audio
            ref={audioElementRef}
            id="audio-preview"
            src={audioUrl}
            className="hidden"
            onTimeUpdate={(event) => setPlaybackTime(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => {
              const metadataDuration = event.currentTarget.duration;
              if (Number.isFinite(metadataDuration) && metadataDuration > 0) {
                setPlaybackDuration(metadataDuration);
              }
            }}
            onDurationChange={(event) => {
              const metadataDuration = event.currentTarget.duration;
              if (Number.isFinite(metadataDuration) && metadataDuration > 0) {
                setPlaybackDuration(metadataDuration);
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
          <button
            type="button"
            id="audio-preview-toggle"
            onClick={togglePlayback}
            aria-label={isPlaying ? copy.audio.pausePreview : copy.audio.playPreview}
            title={isPlaying ? copy.audio.pausePreview : copy.audio.playPreview}
            className="w-9 h-9 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/30 hover:bg-teal-500/25 flex items-center justify-center shrink-0 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <div
            role="slider"
            tabIndex={0}
            aria-label={copy.audio.preview}
            aria-valuemin={0}
            aria-valuemax={playbackDuration || 0}
            aria-valuenow={playbackTime}
            onClick={handleSeek}
            className="flex-1 h-2 rounded-full bg-surface-2 cursor-pointer relative"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-teal-400"
              style={{ width: `${playbackDuration ? (playbackTime / playbackDuration) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-text-3 tabular-nums shrink-0">
            {formatPlaybackTime(playbackTime)} / {formatPlaybackTime(playbackDuration)}
          </span>
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
            {copy.audio.transcriptLabel}
          </label>
          {status === 'recording' && (
            <span className="text-xs text-teal-400">{copy.audio.transcribing}</span>
          )}
        </div>
        <textarea
          id="audio-transcript-input"
          value={transcriptValue}
          onChange={(event) => onTranscriptChange?.(event.target.value)}
          placeholder={
            isSpeechRecognitionSupported
              ? copy.audio.transcriptPlaceholder
              : copy.audio.transcriptFallback
          }
          rows={4}
          className="input-field"
        />
        <p className="text-xs text-text-3 mt-2">
          {copy.audio.reviewTranscript}
        </p>
      </div>

      {transcriptionError && (
        <div className="mt-4 flex items-start gap-2 text-sm text-gold-400 bg-gold-500/10 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{transcriptionError} {copy.audio.canEdit}</span>
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
