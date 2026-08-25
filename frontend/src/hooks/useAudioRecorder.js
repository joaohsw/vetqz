/**
 * useAudioRecorder — Hook de gravação de áudio com MediaRecorder API.
 *
 * Estados: idle → recording → paused → idle
 * Retorna o Blob gravado e funções de controle.
 */

import { useState, useRef, useCallback } from 'react';

/**
 * @typedef {'idle' | 'recording' | 'paused'} RecordingStatus
 */

export function useAudioRecorder() {
  const [status, setStatus] = useState('idle');
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [transcriptionError, setTranscriptionError] = useState(null);

  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const speechRecognition = useRef(null);
  const finalTranscript = useRef('');
  const shouldRestartRecognition = useRef(false);

  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;
  const isSpeechRecognitionSupported = Boolean(SpeechRecognition);

  /** Inicia/reinicia a transcrição nativa do navegador. */
  const startSpeechRecognition = useCallback((resetTranscript = false) => {
    if (!SpeechRecognition) return;

    if (resetTranscript) {
      finalTranscript.current = '';
      setTranscript('');
      setTranscriptionError(null);
    }

    if (!speechRecognition.current) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;

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
          'not-allowed': 'Permissão para transcrição negada.',
          'service-not-allowed': 'O serviço de transcrição está bloqueado no navegador.',
          network: 'A transcrição do navegador está indisponível no momento.',
          'audio-capture': 'Não foi possível capturar o áudio para transcrição.',
        };
        setTranscriptionError(messages[event.error] || `Falha na transcrição: ${event.error}`);
      };

      recognition.onend = () => {
        if (
          shouldRestartRecognition.current &&
          mediaRecorder.current?.state === 'recording'
        ) {
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
    try {
      speechRecognition.current.start();
    } catch {
      // A instância já pode estar ativa.
    }
  }, [SpeechRecognition]);

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
        setAudioBlob(blob);
        setAudioUrl(url);

        // Para todas as tracks do stream
        stream.getTracks().forEach((track) => track.stop());

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
          ? 'Permissão de microfone negada. Ative nas configurações do navegador.'
          : `Erro ao acessar o microfone: ${err.message}`
      );
      setStatus('idle');
    }
  }, [startSpeechRecognition]);

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
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setError(null);
    setTranscript('');
    setTranscriptionError(null);
    setStatus('idle');
    audioChunks.current = [];
    finalTranscript.current = '';
  }, [audioUrl, stopSpeechRecognition]);

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
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  };
}
