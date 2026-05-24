import { useState, useRef, useCallback, useEffect } from 'react';
import { BASE_URL, apiFetch } from '../utils/api.js';

// ── SSE stream helper (module-level, parallel limit = 2) ──────────────────────
let _streamInflight = 0;
const MAX_STREAM_INFLIGHT = 2;

async function translateStream(text, sourceLang, targetLang, onChunk, onDone, signal) {
  if (_streamInflight >= MAX_STREAM_INFLIGHT) { onDone?.(); return; }
  _streamInflight++;
  try {
    const res = await apiFetch('/api/translate/stream', { text, sourceLang, targetLang }, signal);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split('\n\n');
      buf = parts.pop();
      for (const part of parts) {
        if (!part.startsWith('data: ')) continue;
        const data = part.slice(6).trim();
        if (data === '[DONE]') break outer;
        try {
          const parsed = JSON.parse(data);
          if (parsed.chunk) onChunk?.(parsed.chunk);
        } catch {}
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') console.error('[translateStream]', err.message);
  } finally {
    _streamInflight--;
    onDone?.();
  }
}

const MAX_RETRIES   = 3;
const RETRY_DELAYS  = [1000, 2000, 4000]; // exponential backoff: 1s → 2s → 4s

// sleep that can be cancelled via AbortSignal
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    }, { once: true });
  });
}

// Wraps fetch with retry + rate-limit detection.
// Passes the same AbortSignal through all attempts so user-abort still works.
async function fetchWithRetry(path, body, signal, attempt = 0) {
  let res;
  try {
    res = await apiFetch(path, body, signal);
  } catch (err) {
    // Don't retry user-initiated cancels or rate-limit errors
    if (err.name === 'AbortError' || err.code === 'rate-limit') throw err;

    if (attempt < MAX_RETRIES - 1) {
      console.warn(`[useTranslation] Tarmoq xatosi, ${attempt + 1}/${MAX_RETRIES} urinish...`);
      await sleep(RETRY_DELAYS[attempt], signal);
      return fetchWithRetry(path, body, signal, attempt + 1);
    }
    throw err;
  }

  // 429 Rate limit — never retry, surface immediately
  if (res.status === 429) {
    const err = new Error("Too many requests. Please wait a moment.");
    err.code = 'rate-limit';
    throw err;
  }

  // 5xx — retry with backoff
  if (res.status >= 500 && attempt < MAX_RETRIES - 1) {
    console.warn(`[useTranslation] Server xatosi ${res.status}, ${attempt + 1}/${MAX_RETRIES} urinish...`);
    await sleep(RETRY_DELAYS[attempt], signal);
    return fetchWithRetry(path, body, signal, attempt + 1);
  }

  return res;
}

/**
 * useTranslation
 *
 * Gemini orqali matn tarjimasi uchun hook.
 * Retry (3x, exponential backoff), rate-limit, offline detection.
 *
 * @returns {{
 *   translation:    string,
 *   isTranslating:  boolean,
 *   isOffline:      boolean,
 *   latency:        number | null,
 *   error:          string,
 *   translateText:  (text, sourceLang, targetLang?) => Promise<{translation,latency,errorCode?}>
 * }}
 */
export function useTranslation() {
  const [translation, setTranslation]     = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isOffline, setIsOffline]         = useState(!navigator.onLine);
  const [latency, setLatency]             = useState(null);
  const [error, setError]                 = useState('');

  // Track online / offline at the browser level
  useEffect(() => {
    const goOnline  = () => { console.log('[useTranslation] Online'); setIsOffline(false); };
    const goOffline = () => { console.log('[useTranslation] Offline'); setIsOffline(true);  };
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const cacheRef = useRef({ text: '', sourceLang: '', targetLang: '', result: '' });
  const abortRef = useRef(null);

  const translateText = useCallback(async (text, sourceLang, targetLang = 'uz') => {
    const trimmed = text?.trim();
    if (!trimmed) return { translation: '', latency: null };

    // Cache hit
    const cache = cacheRef.current;
    if (
      cache.text       === trimmed    &&
      cache.sourceLang === sourceLang &&
      cache.targetLang === targetLang &&
      cache.result     !== ''
    ) {
      console.log('[useTranslation] Cache hit →', cache.result);
      setTranslation(cache.result);
      setError('');
      return { translation: cache.result, latency: null };
    }

    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
      console.log('[useTranslation] Oldingi so\'rov bekor qilindi');
    }

    const controller = new AbortController();
    abortRef.current = controller;

    // Safety timeout: 30s
    const timeoutId = setTimeout(() => {
      if (abortRef.current === controller) {
        console.warn('[useTranslation] 30s timeout — bekor qilindi');
        controller.abort();
      }
    }, 30_000);

    console.log('[useTranslation] So\'rov yuborilmoqda:', { trimmed, sourceLang, targetLang });
    setIsTranslating(true);
    setError('');

    try {
      const start = Date.now();
      const res = await fetchWithRetry(
        '/api/translate',
        { text: trimmed, sourceLang, targetLang },
        controller.signal,
      );

      const clientLatency = Date.now() - start;
      const data = await res.json();
      console.log('[useTranslation] Javob:', data, `| latency: ${clientLatency}ms`);

      if (!res.ok) throw new Error(data.error || `Server error: HTTP ${res.status}`);

      const result        = data.translation ?? '';
      const serverLatency = data.latency     ?? clientLatency;

      cacheRef.current = { text: trimmed, sourceLang, targetLang, result };
      setTranslation(result);
      setLatency(serverLatency);
      setIsOffline(false);
      console.log(`[useTranslation] ✔ "${result}" (${serverLatency}ms)`);

      return { translation: result, latency: serverLatency };

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[useTranslation] Bekor qilindi (AbortError)');
        return { translation: '', latency: null };
      }

      // Rate limit
      if (err.code === 'rate-limit') {
        console.warn('[useTranslation] Rate limit:', err.message);
        setError(err.message);
        return { translation: '', latency: null, errorCode: 'rate-limit' };
      }

      // Network / backend down
      const isNetworkErr = err instanceof TypeError || err.message?.includes('fetch') || !navigator.onLine;
      if (isNetworkErr) {
        console.warn('[useTranslation] Backend yetib bo\'lmadi — offline rejim');
        setIsOffline(true);
        setError("Backend offline: translation stopped, speech recognition only");
        return { translation: '', latency: null, errorCode: 'offline' };
      }

      const msg = err.message || "Unknown error";
      console.error('[useTranslation] ✘', msg);
      setError(msg);
      return { translation: '', latency: null };

    } finally {
      clearTimeout(timeoutId);
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsTranslating(false);
      }
    }
  }, []);

  return {
    translation,
    isTranslating,
    isOffline,
    latency,
    error,
    translateText,
    translateStream,
  };
}
