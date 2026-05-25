import { useState, useRef, useCallback, useEffect } from 'react';
import { BASE_URL } from '../utils/api.js';

const SEND_INTERVAL_MS = 3000;
const MIN_BLOB_SIZE    = 1000;

export function useGroqSTT({ lang, onTranscript, onError } = {}) {
  const [isListening, setIsListening] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const sendIntervalRef  = useRef(null);
  const langRef          = useRef(lang);
  const onTranscriptRef  = useRef(onTranscript);
  const onErrorRef       = useRef(onError);

  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const sendAudio = useCallback(async () => {
    if (audioChunksRef.current.length === 0) return;

    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    audioChunksRef.current = [];

    if (blob.size < MIN_BLOB_SIZE) return;

    const formData = new FormData();
    formData.append('audio', blob, 'audio.webm');
    formData.append('lang', langRef.current);

    try {
      const res = await fetch(`${BASE_URL}/api/stt`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' },
        body:   formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.text?.trim()) {
        onTranscriptRef.current?.(data.text.trim());
      }
    } catch (err) {
      console.error('[GroqSTT]', err);
      onErrorRef.current?.(err);
    }
  }, []);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current  = recorder;
      audioChunksRef.current    = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      sendIntervalRef.current = setInterval(sendAudio, SEND_INTERVAL_MS);
      recorder.start(1000);
      setIsListening(true);
    } catch (err) {
      console.error('[GroqSTT] startListening:', err);
      onErrorRef.current?.(err);
    }
  }, [sendAudio]);

  const stopListening = useCallback(() => {
    clearInterval(sendIntervalRef.current);
    sendIntervalRef.current = null;

    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.stop();
      recorder.stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current = null;
    }
    audioChunksRef.current = [];
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      clearInterval(sendIntervalRef.current);
      mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return { isListening, startListening, stopListening };
}
