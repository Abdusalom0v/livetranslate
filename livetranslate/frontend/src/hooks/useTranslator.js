import { useCallback, useRef, useState } from 'react';
import { translateText } from '../utils/api.js';
import { speak, stopSpeaking } from '../utils/tts.js';
import { useSpeechRecognition } from './useSpeechRecognition.js';

const LANG_CODES = { en: 'en-US', hi: 'hi-IN' };

export function useTranslator() {
  const [sourceLang, setSourceLang] = useState('en');
  const [status, setStatus] = useState('idle'); // idle | listening | translating | speaking | error
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [error, setError] = useState('');
  const pendingRef = useRef('');

  const handleResult = useCallback(
    async ({ finalTranscript, interimTranscript }) => {
      if (interimTranscript) {
        setOriginalText(interimTranscript);
        pendingRef.current = interimTranscript;
      }

      if (!finalTranscript) return;

      setOriginalText(finalTranscript);
      pendingRef.current = '';
      setStatus('translating');

      try {
        const translation = await translateText(finalTranscript, sourceLang);
        setTranslatedText(translation);
        setStatus('speaking');
        speak(translation, () => setStatus('listening'));
      } catch (err) {
        setError(err.message);
        setStatus('error');
      }
    },
    [sourceLang]
  );

  const handleError = useCallback((msg) => {
    setError(msg);
    setStatus('error');
  }, []);

  const { listening, start, stop } = useSpeechRecognition({
    lang: LANG_CODES[sourceLang],
    onResult: handleResult,
    onError: handleError,
  });

  const toggle = useCallback(() => {
    if (listening) {
      stop();
      stopSpeaking();
      setStatus('idle');
    } else {
      setError('');
      setOriginalText('');
      setTranslatedText('');
      setStatus('listening');
      start();
    }
  }, [listening, start, stop]);

  return {
    sourceLang,
    setSourceLang,
    status,
    listening,
    originalText,
    translatedText,
    error,
    toggle,
  };
}
