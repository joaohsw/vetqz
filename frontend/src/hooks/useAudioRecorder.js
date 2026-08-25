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

  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

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
  }, []);

  /**
   * Para a gravação e gera o Blob de áudio.
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      setStatus('idle');
    }
  }, []);

  /**
   * Pausa a gravação.
   */
  const pauseRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.pause();
      setStatus('paused');
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, []);

  /**
   * Retoma a gravação pausada.
   */
  const resumeRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'paused') {
      mediaRecorder.current.resume();
      setStatus('recording');
      const elapsed = duration;
      startTimeRef.current = Date.now() - elapsed * 1000;
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
  }, [duration]);

  /**
   * Reseta o estado para permitir nova gravação.
   */
  const resetRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setError(null);
    setStatus('idle');
    audioChunks.current = [];
  }, [audioUrl]);

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
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  };
}
