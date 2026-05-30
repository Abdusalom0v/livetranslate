import { useState, useRef, useCallback, useEffect } from 'react';
import { BASE_URL } from '../utils/api.js';

const SEGMENT_MS    = 5000;
const MIN_BLOB_SIZE = 1000;

export function useGroqSTT({ lang, onTranscript, onError } = {}) {
  const [isListening, setIsListening] = useState(false);

  const streamRef        = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const rotateTimerRef   = useRef(null);
  const activeRef        = useRef(false);
  const langRef          = useRef(lang);
  const onTranscriptRef  = useRef(onTranscript);
  const onErrorRef       = useRef(onError);

  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const sendBlob = useCallback(async (blob) => {
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
      if (data.text?.trim()) onTranscriptRef.current?.(data.text.trim());
    } catch (err) {
      console.error('[GroqSTT]', err);
      onErrorRef.current?.(err);
    }
  }, []);

  // Yangi recorder yaratib, bir segmentni yozadi.
  // stop() chaqirilganda onstop → to'liq valid WebM blob → sendBlob → launchRecorder
  const launchRecorder = useCallback((stream) => {
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    const recorder = new MediaRecorder(stream, { mimeType });
    audioChunksRef.current   = [];
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      const chunks = audioChunksRef.current;
      audioChunksRef.current   = [];
      mediaRecorderRef.current = null;

      if (chunks.length > 0 && activeRef.current) {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (blob.size >= MIN_BLOB_SIZE) await sendBlob(blob);
      }

      // Darhol keyingi segmentni boshlash (audio uzilmaydi)
      if (activeRef.current && stream.active) launchRecorder(stream);
    };

    recorder.start(); // timeslice yo'q — stop() da bitta to'liq WebM
  }, [sendBlob]);

  const startListening = useCallback(async () => {
    if (mediaRecorderRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      activeRef.current = true;
      launchRecorder(stream);
      rotateTimerRef.current = setInterval(
        () => mediaRecorderRef.current?.stop(),
        SEGMENT_MS
      );
      setIsListening(true);
    } catch (err) {
      console.error('[GroqSTT] startListening:', err);
      onErrorRef.current?.(err);
    }
  }, [launchRecorder]);

  const stopListening = useCallback(() => {
    activeRef.current = false;
    clearInterval(rotateTimerRef.current);
    rotateTimerRef.current = null;

    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.onstop = null; // yangi recorder boshlanmasin
      recorder.stop();
      mediaRecorderRef.current = null;
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current  = null;
    audioChunksRef.current = [];
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      clearInterval(rotateTimerRef.current);
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return { isListening, startListening, stopListening };
}
