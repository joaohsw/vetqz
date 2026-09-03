/**
 * useAudioRecorder — Hook de gravação de áudio com MediaRecorder API.
 *
 * Estados: idle → recording → paused → idle
 * Retorna o Blob gravado e funções de controle.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { formatMessage, getTranslations } from '../i18n';

/**
 * @typedef {'idle' | 'recording' | 'paused'} RecordingStatus
 */

/**
 * Detecta se o navegador é Chrome ou Safari genuínos — os únicos com suporte
 * confiável à Web Speech API. Forks Chromium (Opera, Opera GX, Brave, Vivaldi,
 * Edge) expõem o objeto `webkitSpeechRecognition`, mas nenhum evento dispara.
 */
function detectLikelySupportedBrowser() {
  if (typeof navigator === 'undefined') return true;

  const ua = navigator.userAgent;
  const isChrome = /Chrome\//.test(ua) && !/Edg\/|OPR\/|Brave\//.test(ua);
  const isSafari = /Safari\//.test(ua) && !/Chrome\/|Chromium\/|Android/.test(ua);

  return isChrome || isSafari;
}

export function useAudioRecorder(language) {
  const copy = getTranslations(language);
  const [status, setStatus] = useState('idle');
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [transcriptionError, setTranscriptionError] = useState(null);
  const [recognitionUnavailable, setRecognitionUnavailable] = useState(false);

  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const speechRecognition = useRef(null);
  const finalTranscript = useRef('');
  const shouldRestartRecognition = useRef(false);
  const mediaStream = useRef(null);
  const audioUrlRef = useRef(null);
  const hasRecognitionStartedRef = useRef(false);

  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;
  const isSpeechRecognitionSupported = Boolean(SpeechRecognition);
  const isBrowserLikelySupported = detectLikelySupportedBrowser();

  /** Inicia/reinicia a transcrição nativa do navegador. */
  const startSpeechRecognition = useCallback((resetTranscript = false) => {
    if (!SpeechRecognition) return;

    if (resetTranscript) {
      finalTranscript.current = '';
      setTranscript('');
      setTranscriptionError(null);
      setRecognitionUnavailable(false);
    }

    if (!speechRecognition.current) {
      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        hasRecognitionStartedRef.current = true;
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript.current = `${finalTranscript.current} ${text}`.trim();
          } else {
            interimTranscript += text;
          }
        }

        setTranscript(`${finalTranscript.current} ${interimTranscript}`.trim());
      };

      recognition.onerror = (event) => {
        if (event.error === 'no-speech' || event.error === 'aborted') return;

        const messages = {
          'not-allowed': copy.audio.errors.transcriptionDenied,
          'service-not-allowed': copy.audio.errors.transcriptionBlocked,
          network: copy.audio.errors.transcriptionNetwork,
          'audio-capture': copy.audio.errors.transcriptionCapture,
        };
        setTranscriptionError(
          messages[event.error] ||
            formatMessage(copy.audio.errors.transcriptionGeneric, { error: event.error })
        );
      };

      // Alguns navegadores (ex.: Opera/Opera GX) expõem a API mas nunca
      // conseguem iniciar a sessão real — onend dispara sem onstart/onerror.
      recognition.onend = () => {
        const failedToStart = !hasRecognitionStartedRef.current && shouldRestartRecognition.current;

        if (failedToStart) {
          shouldRestartRecognition.current = false;
          setRecognitionUnavailable(true);
          return;
        }

        if (
          shouldRestartRecognition.current &&
          mediaRecorder.current?.state === 'recording'
        ) {
          hasRecognitionStartedRef.current = false;
          try {
            recognition.start();
          } catch {
            // O navegador ainda está encerrando a sessão anterior.
          }
        }
      };

      speechRecognition.current = recognition;
    }

    shouldRestartRecognition.current = true;
    hasRecognitionStartedRef.current = false;
    try {
      speechRecognition.current.start();
    } catch {
      // A instância já pode estar ativa.
    }
  }, [SpeechRecognition, copy, language]);

  const stopSpeechRecognition = useCallback(() => {
    shouldRestartRecognition.current = false;
    try {
      speechRecognition.current?.stop();
    } catch {
      // A instância já pode estar parada.
    }
  }, []);

  /**
   * Inicia a gravação de áudio.
   * Solicita permissão do microfone se necessário.
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      setAudioUrl(null);
      setDuration(0);
      setTranscript('');
      setTranscriptionError(null);
      audioChunks.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream.current = stream;

      // Tenta webm primeiro, wav como fallback
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/wav';

      mediaRecorder.current = new MediaRecorder(stream, { mimeType });

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        setAudioBlob(blob);
        setAudioUrl(url);

        // Para todas as tracks do stream
        stream.getTracks().forEach((track) => track.stop());
        mediaStream.current = null;

        // Para o timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      mediaRecorder.current.start(250); // Coleta dados a cada 250ms
      setStatus('recording');
      startSpeechRecognition(true);

      // Timer de duração
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err) {
      setError(
        err.name === 'NotAllowedError'
          ? copy.audio.errors.microphoneDenied
          : formatMessage(copy.audio.errors.microphoneGeneric, { error: err.message })
      );
      setStatus('idle');
    }
  }, [copy, startSpeechRecognition]);

  /**
   * Para a gravação e gera o Blob de áudio.
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      stopSpeechRecognition();
      setStatus('idle');
    }
  }, [stopSpeechRecognition]);

  /**
   * Pausa a gravação.
   */
  const pauseRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.pause();
      stopSpeechRecognition();
      setStatus('paused');
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [stopSpeechRecognition]);

  /**
   * Retoma a gravação pausada.
   */
  const resumeRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'paused') {
      mediaRecorder.current.resume();
      startSpeechRecognition(false);
      setStatus('recording');
      const elapsed = duration;
      startTimeRef.current = Date.now() - elapsed * 1000;
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
  }, [duration, startSpeechRecognition]);

  /**
   * Reseta o estado para permitir nova gravação.
   */
  const resetRecording = useCallback(() => {
    stopSpeechRecognition();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      audioUrlRef.current = null;
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setError(null);
    setTranscript('');
    setTranscriptionError(null);
    setRecognitionUnavailable(false);
    setStatus('idle');
    audioChunks.current = [];
    finalTranscript.current = '';
  }, [audioUrl, stopSpeechRecognition]);

  useEffect(() => () => {
    shouldRestartRecognition.current = false;
    try {
      speechRecognition.current?.abort();
    } catch {
      // A instância pode já ter sido encerrada pelo navegador.
    }
    if (mediaRecorder.current?.state !== 'inactive') {
      try {
        mediaRecorder.current?.stop();
      } catch {
        // O gravador pode já estar finalizando.
      }
    }
    mediaStream.current?.getTracks().forEach((track) => track.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
  }, []);

  /**
   * Formata duração em mm:ss.
   */
  const formattedDuration = `${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}`;

  return {
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
  };
}
