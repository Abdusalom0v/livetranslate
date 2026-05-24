import { useState, useRef, useCallback, useEffect } from 'react';

// ── 2-harfli kod → BCP-47 xaritasi ───────────────────────────────────────────
// Eksport qilinadi: langDetect.js va boshqa modullar ishlatadi
export const SUPPORTED_LANGS = {
  'en': 'en-US',  'uz': 'uz-UZ',  'es': 'es-ES',  'zh': 'zh-CN',
  'hi': 'hi-IN',  'fr': 'fr-FR',  'de': 'de-DE',  'it': 'it-IT',
  'nl': 'nl-NL',  'pt': 'pt-PT',  'pl': 'pl-PL',  'ja': 'ja-JP',
  'ko': 'ko-KR',  'vi': 'vi-VN',  'id': 'id-ID',  'th': 'th-TH',
  'kk': 'kk-KZ',  'ky': 'ky-KG',  'tg': 'tg-TJ',  'tk': 'tk-TM',
  'az': 'az-AZ',  'ka': 'ka-GE',  'hy': 'hy-AM',  'ar': 'ar-SA',
  'fa': 'fa-IR',  'he': 'he-IL',  'tr': 'tr-TR',  'ru': 'ru-RU',
  'uk': 'uk-UA',  'be': 'be-BY',  'ro': 'ro-RO',  'hu': 'hu-HU',
  'cs': 'cs-CZ',  'sw': 'sw-KE',
};

/*
 * Chrome Web Speech API (Google Cloud Speech) qo'llab-quvvatlaydigan tillar.
 *
 * ✅ Ishonchli ishlaydi (2025):
 *   en-US  es-ES  zh-CN  hi-IN  fr-FR  de-DE  it-IT  nl-NL
 *   pt-PT  pl-PL  ja-JP  ko-KR  vi-VN  id-ID  th-TH  ar-SA
 *   fa-IR  he-IL  tr-TR  ru-RU  uk-UA  ro-RO  hu-HU  cs-CZ  sw-KE
 *
 * ❌ Chrome da ishlamaydi — en-US ga avtomatik o'tiladi:
 *   uz-UZ  kk-KZ  ky-KG  tg-TJ  tk-TM  ka-GE  hy-AM  be-BY
 */
const CHROME_UNSUPPORTED = new Set([
  'uz-UZ', 'kk-KZ', 'ky-KG', 'tg-TJ',
  'tk-TM', 'ka-GE', 'hy-AM', 'be-BY',
]);

const FALLBACK = 'en-US';

const SYNC_WORD_THRESHOLD = 3;
const countWords = (t) => t.trim().split(/\s+/).filter(Boolean).length;

// ── Brauzer API (bir marta aniqlanadi) ────────────────────────────────────────
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null)
    : null;

// ── Xato xabarlari ────────────────────────────────────────────────────────────
const ERROR_MESSAGES = {
  'not-allowed':            "Microphone access denied. Please allow microphone access in browser settings.",
  'no-speech':              "No speech detected. Please speak closer to the microphone.",
  'audio-capture':          "No microphone found. Check that your device is connected.",
  'network':                "Network error. Check your internet connection.",
  'service-not-allowed':    "Speech Recognition is not allowed on this page.",
  'language-not-supported': "This language is not supported by the Web Speech API.",
};

/**
 * lang ni to'liq BCP-47 ga keltiradi.
 * Kirish: 'en-US' | 'hi-IN' | 'en' | 'hi'  — ikkalasi ham qabul qilinadi.
 * Chiqish: to'liq BCP-47, Chrome da ishlamasa → 'en-US'
 */
function toBcp47(lang) {
  if (!lang) return FALLBACK;
  // 2-harfli kod bo'lsa mapdan qidirish ('en' → 'en-US')
  const bcp47 = SUPPORTED_LANGS[lang] ?? lang;
  if (CHROME_UNSUPPORTED.has(bcp47)) {
    console.warn(`[STT] "${bcp47}" Chrome da qo'llanmaydi → "${FALLBACK}" ga o'tildi`);
    return FALLBACK;
  }
  return bcp47;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
/**
 * useSpeechRecognition
 *
 * @param {object}   opts
 * @param {string}   opts.lang          — BCP-47 ('en-US', 'hi-IN', 'uz-UZ') yoki
 *                                        2-harfli kod ('en', 'hi', 'uz')
 * @param {function} opts.onFinalResult — final natija: (text: string) => void
 *
 * @returns {{
 *   transcript:        string,
 *   interimTranscript: string,
 *   isListening:       boolean,
 *   isSupported:       boolean,
 *   startListening:    () => void,
 *   stopListening:     () => void,
 *   resetTranscript:   () => void,
 *   error:             string,
 * }}
 */
export function useSpeechRecognition({ lang = 'en-US', onFinalResult, onInterimTranslate } = {}) {
  const [transcript, setTranscript]               = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening]             = useState(false);
  const [error, setError]                         = useState('');
  const [errorCode, setErrorCode]                 = useState('');

  const recRef                = useRef(null);
  const stoppedByUser         = useRef(false);
  const langRef               = useRef(toBcp47(lang));
  const syncWordCountRef      = useRef(0);
  const onInterimTranslateRef = useRef(onInterimTranslate);

  useEffect(() => { langRef.current = toBcp47(lang); }, [lang]);
  useEffect(() => { onInterimTranslateRef.current = onInterimTranslate; }, [onInterimTranslate]);

  // ── Recognition obyektini sozlash ──────────────────────────────────────────
  const buildRecognition = useCallback(() => {
    const rec            = new SpeechRecognitionAPI();
    rec.lang             = langRef.current;
    rec.continuous       = true;
    rec.interimResults   = true;
    rec.maxAlternatives  = 1;

    rec.onstart = () => {
      setIsListening(true);
      setError('');
      syncWordCountRef.current = 0;
    };

    rec.onresult = (event) => {
      console.log('[STT] Result keldi:', event.results.length, '| index:', event.resultIndex);
      let interim = '';
      let final   = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text   = result[0].transcript;

        if (result.isFinal) {
          final += text;
          console.log(
            `[STT] ✔ final  conf=${(result[0].confidence * 100).toFixed(0)}%  "${text}"`
          );
        } else {
          interim += text;
        }
      }

      setInterimTranscript(interim);

      if (final) {
        syncWordCountRef.current = 0;
        setTranscript(final);
        onFinalResult?.(final.trim());
      }

      // Har 4 yangi so'zda sinxron tarjima trigger
      if (interim) {
        const total = countWords(interim);
        if (total - syncWordCountRef.current >= SYNC_WORD_THRESHOLD) {
          syncWordCountRef.current = total;
          onInterimTranslateRef.current?.(interim);
        }
      }
    };

    rec.onerror = (event) => {
      // 'aborted' — stopListening chaqirilganda keladi, haqiqiy xato emas
      if (event.error === 'aborted') return;

      const msg = ERROR_MESSAGES[event.error] ?? `Xato: ${event.error}`;
      console.error('[STT] ✘', event.error, '→', msg);
      setError(msg);
      setErrorCode(event.error);

      // Qayta urinib bo'lmaydigan xatolar — tinglashni to'liq to'xtatamiz
      if (['not-allowed', 'audio-capture', 'service-not-allowed'].includes(event.error)) {
        stoppedByUser.current = true;
        setIsListening(false);
      }
    };

    rec.onend = () => {
      setIsListening(false);
      setInterimTranscript('');

      // Foydalanuvchi to'xtatmagan bo'lsa — avtomatik qayta boshlash
      // (Chrome 'no-speech' dan keyin onend chiqaradi)
      if (!stoppedByUser.current && recRef.current === rec) {
        setTimeout(() => {
          if (!stoppedByUser.current) {
            try { rec.start(); } catch { /* allaqachon ishlayapti */ }
          }
        }, 250);
      }
    };

    return rec;
  }, [onFinalResult]);

  // ── Public API ─────────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError(
        "This browser does not support the Web Speech API. " +
        "Please use Google Chrome or Microsoft Edge."
      );
      setErrorCode('not-supported');
      return;
    }
    if (isListening) return;

    stoppedByUser.current = false;
    setError('');
    setErrorCode('');
    setTranscript('');
    setInterimTranscript('');

    const rec = buildRecognition();
    recRef.current = rec;

    try {
      rec.start();
    } catch (err) {
      setError('Microphone failed to start: ' + err.message);
    }
  }, [isListening, buildRecognition]);

  const stopListening = useCallback(() => {
    stoppedByUser.current = true;
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      try { rec.stop(); } catch { /* ignore */ }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Komponent unmount bo'lganda tozalaymiz
  useEffect(() => {
    return () => {
      stoppedByUser.current = true;
      recRef.current?.stop();
    };
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    isSupported:    Boolean(SpeechRecognitionAPI),
    startListening,
    stopListening,
    resetTranscript,
    error,
    errorCode,
  };
}
