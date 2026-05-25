import { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';

// ── Hooks ─────────────────────────────────────────────────────────────────────
import { useSpeechRecognition }       from './hooks/useSpeechRecognition.js';
import { useTranslation }             from './hooks/useTranslation.js';
import { useTTS, SUPPORTED_LANGS }    from './hooks/useTTS.js';

// ── Components ────────────────────────────────────────────────────────────────
import { AnimatedBackground }   from './components/AnimatedBackground.jsx';
import { MicButton }            from './components/MicButton.jsx';
import { TranscriptPanel }      from './components/TranscriptPanel.jsx';
import { ControlPanel }         from './components/ControlPanel.jsx';
import { Onboarding }           from './components/Onboarding.jsx';
import { ToastContainer, toast } from './components/Toast.jsx';
import { PermissionModal }      from './components/PermissionModal.jsx';
import {
  IconSettings, IconHistory, IconChevron, IconSwap,
  IconSparkles, IconSave, IconX,
} from './components/Icons.jsx';

// ── Utils ─────────────────────────────────────────────────────────────────────
import { BASE_URL }                            from './utils/api.js';
import { detectLanguage }                      from './utils/langDetect.js';
import { saveSession }                         from './utils/sessionStorage.js';
import { HistoryModal }                        from './components/HistoryModal.jsx';
import { LimitModal }                          from './components/LimitModal.jsx';
import {
  getUsage, incrementSession, isLimitReached,
  isAdminMode,
} from './utils/usageLimit.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const INTERIM_WORD_THRESHOLD = 3;   // har 3 so'zdan keyin tarjima
const INTERIM_DEBOUNCE_MS    = 300; // 300ms sukutdan keyin yuborish

// Chrome STT bu tillarni qo'llab-quvvatlamaydi (fallback tilga o'tiladi)
const CHROME_STT_UNSUPPORTED = new Set(['uz','kk','ky','tg','tk','ka','hy','be']);
// uz → tr-TR fallback bor, shuning uchun dropdown da ko'rinadi (⚠️ bilan)
const STT_WITH_FALLBACK = new Set(['uz']);
const STT_SOURCE_LANGS = SUPPORTED_LANGS.filter(
  l => !CHROME_STT_UNSUPPORTED.has(l.code) || STT_WITH_FALLBACK.has(l.code)
);

let chunkIdCounter = 0;
const nextId    = () => ++chunkIdCounter;
const wordCount = (t) => t.trim().split(/\s+/).filter(Boolean).length;
const nowTime   = () =>
  new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

// ─────────────────────────────────────────────────────────────────────────────
// ── Waveform (3-path, Siri uslubida) ─────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function Waveform({ active }) {
  const w1 = useRef(null), w2 = useRef(null), w3 = useRef(null);
  const SAMPLES = 64, WIDTH = 600, HEIGHT = 56, MID = HEIGHT / 2;

  useEffect(() => {
    if (!active) {
      [w1, w2, w3].forEach(r =>
        r.current?.setAttribute('d', `M0 ${MID} L${WIDTH} ${MID}`)
      );
      return;
    }
    let raf, t = 0;
    const envelope = (ms) => {
      const slow = 0.5 + 0.35 * Math.sin(ms * 0.0008);
      const med  = 0.5 + 0.30 * Math.sin(ms * 0.003 + 1.7);
      const fast = 0.5 + 0.45 * Math.sin(ms * 0.012 + 3.3);
      let a = slow * 0.55 + med * 0.30 + fast * 0.35;
      a *= Math.max(0.15, Math.min(1, Math.sin(ms * 0.0006) + 0.7));
      return Math.max(0.08, Math.min(1, a));
    };
    const buildPath = (ms, amp, phase, freq) => {
      let d = '';
      for (let i = 0; i <= SAMPLES; i++) {
        const x   = (i / SAMPLES) * WIDTH;
        const tau = i / SAMPLES;
        const win = Math.sin(tau * Math.PI);
        const y   = MID
          + Math.sin(tau * Math.PI * freq + ms * 0.005 + phase) * 12 * amp * win
          + Math.sin(tau * Math.PI * (freq * 1.7) - ms * 0.003 + phase * 1.3) * 6 * amp * win;
        d += (i === 0 ? 'M ' : ' L ') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      return d;
    };
    const tick = () => {
      t += 16;
      const amp = envelope(t);
      w1.current?.setAttribute('d', buildPath(t, amp,        0,   5));
      w2.current?.setAttribute('d', buildPath(t, amp * 0.78, 1.2, 7));
      w3.current?.setAttribute('d', buildPath(t, amp * 0.55, 2.4, 9));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, MID]);

  return (
    <svg
      className={`lt-flow${active ? '' : ' lt-flow--idle'}`}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ltflow-grad" x1="0" x2="1">
          <stop offset="0"   stopColor="#7F77DD" />
          <stop offset=".5"  stopColor="#9B91F2" />
          <stop offset="1"   stopColor="#7F77DD" />
        </linearGradient>
      </defs>
      <path ref={w3} className="lt-flow__path lt-flow__path--3" d={`M0 ${MID}`} />
      <path ref={w2} className="lt-flow__path lt-flow__path--2" d={`M0 ${MID}`} />
      <path ref={w1} className="lt-flow__path lt-flow__path--1" d={`M0 ${MID}`} stroke="url(#ltflow-grad)" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Header ────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function Header({ onSettingsClick, onHistoryClick }) {
  return (
    <header className="lt-header">
      <div className="lt-logo">
        <div className="lt-logo__mark">
          <IconSparkles size={16} strokeWidth={2} />
        </div>
        LiveTranslate
        <span className="lt-pill" style={{ fontSize: 10, letterSpacing: '0.08em' }}>BETA</span>
      </div>
      <div className="lt-header__actions">
        <button
          className="lt-iconbtn"
          aria-label="Session history"
          onClick={onHistoryClick}
          title="History"
        >
          <IconHistory size={18} strokeWidth={1.7} />
        </button>
        <button
          className="lt-iconbtn"
          aria-label="Open settings"
          onClick={onSettingsClick}
          title="Settings"
          style={{ position: 'relative' }}
        >
          <IconSettings size={18} strokeWidth={1.7} />
        </button>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── LangDropdown (fixed-position — avoids overflow:hidden clipping) ───────────
// ─────────────────────────────────────────────────────────────────────────────
function LangDropdown({ buttonRef, langs, selected, onSelect, onClose, sttLimitedCodes }) {
  const dropRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  // Position below the anchor button
  useEffect(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 190) });
  }, [buttonRef]);

  // Close on outside click or ESC
  useEffect(() => {
    const click = (e) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) onClose();
    };
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', click);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', click);
      document.removeEventListener('keydown', esc);
    };
  }, [buttonRef, onClose]);

  return (
    <div
      ref={dropRef}
      role="listbox"
      style={{
        position:       'fixed',
        top:            pos.top,
        left:           pos.left,
        minWidth:       pos.width,
        zIndex:         200,
        background:     'var(--color-card)',
        border:         '1px solid var(--color-border-strong)',
        borderRadius:   'var(--r-md)',
        boxShadow:      'var(--shadow-lg)',
        maxHeight:      340,
        overflowY:      'auto',
        padding:        '6px 0',
        backdropFilter: 'blur(16px)',
      }}
    >
      {langs.map(l => (
        <button
          key={l.code}
          role="option"
          aria-selected={l.code === selected}
          onClick={() => { onSelect(l.code); onClose(); }}
          style={{
            display:    'flex',
            width:      '100%',
            gap:        10,
            alignItems: 'center',
            padding:    '9px 14px',
            background: l.code === selected ? 'var(--color-accent-soft)' : 'none',
            border:     'none',
            cursor:     'pointer',
            color:      'var(--fg-1)',
            fontSize:   13,
            textAlign:  'left',
            whiteSpace: 'nowrap',
            transition: 'background 120ms',
          }}
        >
          <span style={{ width: 22, textAlign: 'center', fontSize: 16, flexShrink: 0 }}>
            {l.flag}
          </span>
          <span style={{ flex: 1 }}>{l.name}</span>
          {sttLimitedCodes?.has(l.code) && (
            <span
              title="O'zbek STT cheklangan, turk fallback ishlatiladi"
              style={{ fontSize: 12, opacity: 0.8, marginRight: 2 }}
            >
              ⚠️
            </span>
          )}
          {l.code === selected && (
            <span style={{ color: 'var(--color-accent, #7F77DD)', fontSize: 11 }}>✓</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── LanguageBar ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function LanguageBar({ sourceLang, targetLang, onSwap, onSourceChange, onTargetChange }) {
  const [openSide, setOpenSide] = useState(null); // 'source' | 'target' | null
  const srcBtnRef = useRef(null);
  const tgtBtnRef = useRef(null);

  const source = SUPPORTED_LANGS.find(l => l.code === sourceLang) ?? SUPPORTED_LANGS[0];
  const target = SUPPORTED_LANGS.find(l => l.code === targetLang) ?? SUPPORTED_LANGS[1];

  const toggle = (side) => setOpenSide(prev => prev === side ? null : side);

  return (
    <div className="lt-langbar">
      {/* Source language button */}
      <button
        ref={srcBtnRef}
        className="lt-lang"
        onClick={() => toggle('source')}
        aria-haspopup="listbox"
        aria-expanded={openSide === 'source'}
      >
        <span className="lt-lang__flag">{source.flag}</span>
        <span>{source.name}</span>
        <IconChevron
          size={16}
          style={{
            transform:  openSide === 'source' ? 'rotate(180deg)' : undefined,
            transition: 'transform 180ms',
          }}
        />
      </button>

      {openSide === 'source' && (
        <LangDropdown
          buttonRef={srcBtnRef}
          langs={STT_SOURCE_LANGS}
          selected={sourceLang}
          onSelect={onSourceChange}
          onClose={() => setOpenSide(null)}
          sttLimitedCodes={STT_WITH_FALLBACK}
        />
      )}

      <button className="lt-lang__swap" aria-label="Swap languages" onClick={onSwap}>
        <IconSwap size={18} />
      </button>

      {/* Target language button */}
      <button
        ref={tgtBtnRef}
        className="lt-lang lt-lang--right"
        onClick={() => toggle('target')}
        aria-haspopup="listbox"
        aria-expanded={openSide === 'target'}
      >
        <span className="lt-lang__flag">{target.flag}</span>
        <span>{target.name}</span>
        <IconChevron
          size={16}
          style={{
            transform:  openSide === 'target' ? 'rotate(180deg)' : undefined,
            transition: 'transform 180ms',
          }}
        />
      </button>

      {openSide === 'target' && (
        <LangDropdown
          buttonRef={tgtBtnRef}
          langs={SUPPORTED_LANGS}
          selected={targetLang}
          onSelect={onTargetChange}
          onClose={() => setOpenSide(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── BottomBar (mic + waveform + controls) ─────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function BottomBar({ status, onToggleMic }) {
  return (
    <div className="lt-controls">
      <div className="lt-controls__mic">
        <MicButton
          status={status}
          size={64}
          onClick={onToggleMic}
          ariaLabel={
            status === 'listening' ? 'Stop listening' : 'Start listening'
          }
        />
      </div>

      <Waveform active={status === 'listening'} />

      <div className="lt-controls__spacer" />

      <button className="lt-control-btn lt-control-btn--active">
        <span style={{ width: 8, height: 8, borderRadius: 999, background: 'currentColor' }} />
        Auto-scroll
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── StatusBar ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function StatusBar({ status, latency, chunkCount, isSpeaking, usingElevenLabs, onSave, usage, adminMode }) {
  const isRec = status === 'listening';

  const sessionColor = adminMode
    ? 'var(--color-accent)'
    : usage.remaining === 0
      ? 'var(--color-error)'
      : usage.remaining === 1
        ? '#F59E0B'
        : 'var(--fg-3)';

  return (
    <div className="lt-statusbar">
      {/* Recording indicator */}
      <span className={`lt-status-rec${isRec ? '' : ' lt-status-rec--ready'}`}>
        <span className="lt-status-rec__dot" />
        {isRec ? 'Recording' : 'Ready'}
      </span>

      {/* Latency badge */}
      {latency != null && (
        <span className="lt-status-latency">
          ~{(latency / 1000).toFixed(1)}s
        </span>
      )}

      {/* Chunk counter */}
      <span className="lt-status-latency" style={{ color: 'var(--fg-3)' }}>
        {chunkCount} chunk{chunkCount !== 1 ? 's' : ''}
      </span>

      {/* TTS indicator */}
      {isSpeaking && (
        <span className="lt-status-latency" style={{ color: 'var(--color-accent)' }}>
          {usingElevenLabs ? '▶ ElevenLabs' : '▶ TTS'}
        </span>
      )}

      {/* Session usage */}
      <span className="lt-status-latency" style={{ color: sessionColor }}>
        {adminMode ? '∞ Admin' : `${usage.sessions}/${usage.limit} sessiya`}
      </span>

      <div className="lt-statusbar__spacer" />

      <button className="lt-save-btn" onClick={onSave} disabled={chunkCount === 0}>
        <IconSave size={16} /> Save
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── SettingsDrawer (slide-in from right) ──────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function SettingsDrawer({ open, onClose, children }) {
  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handle = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:      'fixed', inset: 0,
          background:    'rgba(10,10,30,0.55)',
          backdropFilter:'blur(3px)',
          zIndex:        50,
          opacity:       open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition:    'opacity 220ms var(--ease-out)',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position:   'fixed', top: 0, right: 0, bottom: 0,
          width:      360,
          maxWidth:   '95vw',
          zIndex:     51,
          transform:  open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 280ms var(--ease-out)',
          overflowY:  'auto',
          background: 'var(--color-bg)',
          borderLeft: '1px solid var(--color-border)',
          boxShadow:  '-12px 0 48px rgba(0,0,0,0.30)',
          display:    'flex',
          flexDirection: 'column',
        }}
        aria-hidden={!open}
        role="dialog"
        aria-label="Settings"
      >
        {/* Drawer header */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        'var(--sp-5) var(--sp-6) var(--sp-4)',
          borderBottom:   '1px solid var(--color-divider)',
          position:       'sticky',
          top:            0,
          background:     'var(--color-bg)',
          backdropFilter: 'blur(10px)',
          zIndex:         1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <div style={{
              width:        28, height: 28,
              borderRadius: 'var(--r-sm)',
              background:   'linear-gradient(135deg, var(--color-accent), var(--orb-violet))',
              display:      'grid', placeItems: 'center',
              boxShadow:    'var(--glow-accent)',
            }}>
              <IconSettings size={14} strokeWidth={2} style={{ color: '#fff' }} />
            </div>
            <span style={{
              fontSize:      'var(--fs-md)',
              fontWeight:    'var(--fw-semibold)',
              letterSpacing: 'var(--ls-tight)',
              color:         'var(--fg-1)',
            }}>Settings</span>
          </div>
          <button
            className="lt-iconbtn"
            onClick={onClose}
            aria-label="Close settings"
          >
            <IconX size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 var(--sp-6) var(--sp-8)' }}>
          {children}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Root App ──────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {

  // ── Theme (dark / light) ─────────────────────────────────────────────────────
  const [theme, setTheme] = useState(
    () => localStorage.getItem('lt-theme') ?? 'dark'
  );

  // ── Usage limit ──────────────────────────────────────────────────────────────
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [usage, setUsage] = useState(() => getUsage());
  const [adminMode, setAdminMode] = useState(() => isAdminMode());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lt-theme', theme);
  }, [theme]);

  const handleThemeToggle = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }, []);

  // Check limit on mount
  useEffect(() => {
    if (isLimitReached()) setLimitModalOpen(true);
  }, []);

  // ── Onboarding ──────────────────────────────────────────────────────────────
  const [onboardingDone, setOnboardingDone] = useState(false);

  // ── Language state ───────────────────────────────────────────────────────────
  const [sourceLang, setSourceLang] = useState('en');   // STT + Gemini source
  const [targetLang, setTargetLang] = useState('uz');   // Gemini target + TTS

  // ── Transcript state ─────────────────────────────────────────────────────────
  const [chunks, setChunks]                               = useState([]);
  const [currentOriginal, setCurrentOriginal]             = useState('');
  const [currentTranslation, setCurrentTranslation]       = useState('');

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen]                   = useState(false);
  const [historyOpen, setHistoryOpen]                     = useState(false);
  const [lastLatency, setLastLatency]                     = useState(null);
  const [permModalOpen, setPermModalOpen]                 = useState(false);
  const [permModalType, setPermModalType]                 = useState('not-allowed');

  // ── Internal refs ────────────────────────────────────────────────────────────
  const currentTimeRef        = useRef('');
  const lastInterimWordCount  = useRef(0);
  const lastFinalText         = useRef('');
  const finalPendingRef       = useRef(false);
  const interimInFlightRef    = useRef(false);
  const sessionStartRef       = useRef(Date.now());
  const interimDebounceRef    = useRef(null);
  const syncGenRef            = useRef(0);
  const syncTtsBufferRef      = useRef('');
  const syncActiveRef         = useRef(false);
  const syncAbortRef          = useRef(null);
  const finalQueueRef         = useRef([]);   // concurrent final'larni navbatga olish
  const translateRef          = useRef(null); // har doim eng yangi translate versiyasi
  const workerRef             = useRef(null);
  const workerCallbacksRef    = useRef(new Map());

  // ── Hooks ────────────────────────────────────────────────────────────────────
  const { translateText, translateStream, isTranslating, isOffline, error: translationError } = useTranslation();

  const {
    speak,
    stop:               ttsStop,
    isSpeaking,
    availableVoices,
    ttsEnabled,         setTtsEnabled,
    ttsRate,
    ttsVolume,
    selectedVoiceName,
  } = useTTS();

  const targetLangObj = SUPPORTED_LANGS.find(l => l.code === targetLang);

  // ── Core translation helper ──────────────────────────────────────────────────
  const translate = useCallback(async (text, isFinal = false) => {
    if (!text.trim()) return;

    // Interim: skip if final or another interim is already in flight
    if (!isFinal && (finalPendingRef.current || interimInFlightRef.current)) return;

    // Final: if another final is in-flight, queue (don't abort it — that loses chunks!)
    if (isFinal && finalPendingRef.current) {
      const lastQueued = finalQueueRef.current[finalQueueRef.current.length - 1];
      if (text !== lastQueued && text !== lastFinalText.current) {
        console.log('[App] Final navbatga olindi:', text.slice(0, 30));
        finalQueueRef.current.push(text);
      }
      return;
    }

    if (isFinal) {
      finalPendingRef.current    = true;
      interimInFlightRef.current = false;
      clearTimeout(interimDebounceRef.current); // final kelganda interim debounce bekor
      syncGenRef.current++;           // eski sync stream chunk'larini bekor qil
      syncActiveRef.current = false;  // yangi interim stream boshlana olsin
    } else {
      interimInFlightRef.current = true;
    }

    setCurrentOriginal(text);
    if (isFinal) setCurrentTranslation('');

    let result  = null;
    let latency = null;
    try {
      if (isFinal) {
        // Streaming: birinchi so'z ~300ms da ko'rinadi, to'liq kutilmaydi
        const streamStart = Date.now();
        let fullText = '';
        await new Promise((resolve) => {
          translateStream(text, sourceLang, targetLang, (chunk) => {
            fullText += chunk;
            setCurrentTranslation(fullText);
          }, resolve);
        });
        result  = fullText || null;
        latency = Date.now() - streamStart;
      } else {
        const res = await translateText(text, sourceLang, targetLang);
        result  = res.translation;
        latency = res.latency;
      }
    } finally {
      if (isFinal) finalPendingRef.current    = false;
      else         interimInFlightRef.current = false;
    }

    // Navbatdagi finalga o'tish (muvaffaqiyat yoki xato bo'lsa ham)
    const _processQueue = () => {
      if (finalQueueRef.current.length > 0) {
        const nextText = finalQueueRef.current.shift();
        Promise.resolve().then(() => translateRef.current?.(nextText, true));
      }
    };

    if (!result) {
      if (isFinal) _processQueue();
      return;
    }

    if (isFinal) {
      const time = currentTimeRef.current || nowTime();
      setChunks(prev => [...prev, {
        id: nextId(), source: text, translation: result, time, latency: latency ?? null,
      }]);
      if (latency) setLastLatency(latency);
      setCurrentOriginal('');
      setCurrentTranslation('');
      currentTimeRef.current       = '';
      lastInterimWordCount.current = 0;
      lastFinalText.current        = text;
      speak(result, targetLangObj?.bcp47 ?? 'uz-UZ');
      _processQueue();
    } else {
      setCurrentTranslation(result);
    }
  }, [sourceLang, targetLang, translateText, translateStream, speak, targetLangObj]);

  // translateRef har doim eng yangi versiyani ko'rsatadi (queue uchun kerak)
  useEffect(() => { translateRef.current = translate; }, [translate]);

  // ── Final speech result callback ─────────────────────────────────────────────
  const handleFinalResult = useCallback((finalText) => {
    // Detect lang from spoken text and auto-correct if needed
    const detected = detectLanguage(finalText);
    if (detected !== sourceLang && ['en', 'hi'].includes(detected)) {
      console.log(`[App] Auto-detected lang: ${detected} (was ${sourceLang})`);
    }

    if (finalText === lastFinalText.current) return;  // dedupe
    clearTimeout(interimDebounceRef.current); // pending interim debounce ni bekor qil
    lastInterimWordCount.current = 0;
    translate(finalText, true);
  }, [translate, sourceLang]);

  // ── Sinxron tarjima (Web Worker orqali stream, har 4 so'z) ───────────────────
  const handleSyncTranslate = useCallback((interimText) => {
    const id = ++syncGenRef.current;
    // Eski callbacklarni tozalash (worker javoblarini e'tiborsiz qoldirish)
    workerCallbacksRef.current.delete(id - 1);

    syncTtsBufferRef.current = '';
    syncActiveRef.current    = true;
    let first = true;

    const onChunk = (chunk) => {
      if (syncGenRef.current !== id) return;
      if (first) { setCurrentTranslation(chunk); first = false; }
      else        setCurrentTranslation(prev => prev + chunk);
      syncTtsBufferRef.current += chunk;
      const wc = syncTtsBufferRef.current.trim().split(/\s+/).filter(Boolean).length;
      if (wc >= 5) {
        speak(syncTtsBufferRef.current, targetLangObj?.bcp47 ?? 'uz-UZ');
        syncTtsBufferRef.current = '';
      }
    };

    const onDone = () => {
      if (syncGenRef.current !== id) return;
      syncActiveRef.current = false;
      if (syncTtsBufferRef.current.trim()) {
        speak(syncTtsBufferRef.current, targetLangObj?.bcp47 ?? 'uz-UZ');
        syncTtsBufferRef.current = '';
      }
    };

    workerCallbacksRef.current.set(id, { onChunk, onDone });

    if (workerRef.current) {
      workerRef.current.postMessage({
        id, text: interimText, sourceLang, targetLang, baseUrl: BASE_URL,
      });
    } else {
      // Worker yuklanmagan bo'lsa — to'g'ridan-to'g'ri stream
      translateStream(interimText, sourceLang, targetLang, onChunk, onDone);
    }
  }, [translateStream, sourceLang, targetLang, speak, targetLangObj]);

  // ── Speech recognition ───────────────────────────────────────────────────────
  const {
    interimTranscript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    error:     sttError,
    errorCode: sttErrorCode,
  } = useSpeechRecognition({
    lang:               sourceLang,
    onFinalResult:      handleFinalResult,
    onInterimTranslate: handleSyncTranslate,
  });

  // ── Browser / HTTPS compatibility check (run once on mount) ─────────────────
  const compatFiredRef = useRef(false);
  useEffect(() => {
    // Guard against React StrictMode double-fire
    if (compatFiredRef.current) return;
    compatFiredRef.current = true;

    const hasSpeechAPI =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition != null || window.webkitSpeechRecognition != null);

    if (!hasSpeechAPI) {
      toast.error(
        "This browser does not support speech recognition. " +
        "Please use Google Chrome or Microsoft Edge.",
        { duration: 0 }
      );
    }

    if (
      typeof location !== 'undefined' &&
      location.protocol !== 'https:' &&
      location.hostname !== 'localhost' &&
      location.hostname !== '127.0.0.1'
    ) {
      toast.warn(
        'HTTPS is required for microphone access. The page is running over HTTP — microphone may not work.',
        { duration: 0 }
      );
    }
  }, []);

  // ── Web Worker (tarjima stream) ──────────────────────────────────────────────
  useEffect(() => {
    const worker = new Worker('/workers/translateWorker.js');
    workerRef.current = worker;

    worker.onmessage = ({ data }) => {
      const cbs = workerCallbacksRef.current.get(data.id);
      if (!cbs) return;
      if (data.chunk) cbs.onChunk(data.chunk);
      if (data.done) {
        cbs.onDone();
        workerCallbacksRef.current.delete(data.id);
      }
    };

    worker.onerror = (e) => console.error('[Worker]', e.message);

    return () => { worker.terminate(); workerRef.current = null; };
  }, []);

  // ── STT error → toast or permission modal ────────────────────────────────────
  // Modal cases are NOT deduplicated: startListening() clears errorCode to '',
  // so the next denial produces a real state change and the effect re-runs.
  const prevSttToastRef = useRef('');
  useEffect(() => {
    if (!sttError) return;

    if (sttErrorCode === 'not-allowed') {
      setPermModalType('not-allowed');
      setPermModalOpen(true);
      return;
    }
    if (sttErrorCode === 'audio-capture') {
      setPermModalType('audio-capture');
      setPermModalOpen(true);
      return;
    }
    if (sttErrorCode === 'not-supported') return; // handled by compat check

    // Deduplicate generic toasts only
    if (sttError === prevSttToastRef.current) return;
    prevSttToastRef.current = sttError;
    toast.error(sttError);
  }, [sttError, sttErrorCode]);

  // ── Translation error → toast ─────────────────────────────────────────────
  const prevTranslErrRef = useRef('');
  useEffect(() => {
    if (!translationError || translationError === prevTranslErrRef.current) return;
    prevTranslErrRef.current = translationError;

    if (translationError.includes('chegarasiga')) {
      toast.warn(translationError, { duration: 5000 });
    } else if (translationError.includes('Backend')) {
      // offline toast handled below
    } else {
      toast.error(translationError);
    }
  }, [translationError]);

  // ── Offline / online state changes ───────────────────────────────────────────
  const prevOfflineRef = useRef(null);
  useEffect(() => {
    // Skip first render (don't show "online" toast on load)
    if (prevOfflineRef.current === null) {
      prevOfflineRef.current = isOffline;
      if (isOffline) {
        toast.warn(
          "Offline mode: No internet connection, translation unavailable. Speech recognition only.",
          { duration: 0 }
        );
      }
      return;
    }
    if (isOffline && !prevOfflineRef.current) {
      toast.warn(
        "Internet disconnected: translation stopped, speech recognition only.",
        { duration: 0 }
      );
    } else if (!isOffline && prevOfflineRef.current) {
      toast.success('Internet restored! Translation is back online.', { duration: 3000 });
    }
    prevOfflineRef.current = isOffline;
  }, [isOffline]);

  // ── Interim: live display + debounced translation every 3 words ──────────────
  useEffect(() => {
    if (!interimTranscript) return;

    if (!currentTimeRef.current) currentTimeRef.current = nowTime();
    setCurrentOriginal(interimTranscript);

    if (syncActiveRef.current) return;

    const count   = wordCount(interimTranscript);
    const crossed = Math.floor(count / INTERIM_WORD_THRESHOLD);
    const last    = Math.floor(lastInterimWordCount.current / INTERIM_WORD_THRESHOLD);

    // Only fire when a new 3-word boundary is crossed
    if (crossed <= last || count < INTERIM_WORD_THRESHOLD) return;

    // Debounce: wait 500ms of pause before sending to backend
    clearTimeout(interimDebounceRef.current);
    interimDebounceRef.current = setTimeout(() => {
      lastInterimWordCount.current = count;
      translate(interimTranscript, false);
    }, INTERIM_DEBOUNCE_MS);
  }, [interimTranscript, translate]);

  // Debounce tozalash
  useEffect(() => () => clearTimeout(interimDebounceRef.current), []);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const status = isListening ? 'listening' : isTranslating ? 'processing' : 'idle';

  const handleToggleMic = useCallback(() => {
    if (!isSupported) return;
    if (isListening) {
      stopListening();
    } else {
      if (isLimitReached()) {
        setLimitModalOpen(true);
        return;
      }
      incrementSession();
      setUsage(getUsage());
      startListening();
    }
  }, [isListening, isSupported, startListening, stopListening]);

  const handleSourceChange = useCallback((code) => {
    if (isListening) stopListening();
    resetTranscript();
    setCurrentOriginal('');
    setCurrentTranslation('');
    currentTimeRef.current       = '';
    lastInterimWordCount.current = 0;
    lastFinalText.current        = '';
    finalQueueRef.current        = [];
    setSourceLang(code);
  }, [isListening, stopListening, resetTranscript]);

  const handleTargetChange = useCallback((code) => {
    setTargetLang(code);
    setCurrentTranslation(''); // old translation was for old target
  }, []);

  const handleSwapLangs = useCallback(() => {
    if (isListening) stopListening();
    resetTranscript();
    setCurrentOriginal('');
    setCurrentTranslation('');
    currentTimeRef.current       = '';
    lastInterimWordCount.current = 0;
    lastFinalText.current        = '';
    finalQueueRef.current        = [];
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  }, [isListening, stopListening, resetTranscript, sourceLang, targetLang]);

  const handleClear = useCallback(() => {
    setChunks([]);
    setCurrentOriginal('');
    setCurrentTranslation('');
    finalQueueRef.current   = [];
    sessionStartRef.current = Date.now();
  }, []);

  const handleSaveSession = useCallback(() => {
    if (chunks.length === 0) return;
    const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
    saveSession({
      id:       `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date:     new Date().toISOString(),
      duration,
      langs:    { source: sourceLang, target: targetLang },
      chunks:   chunks.map(c => ({ id: c.id, time: c.time, source: c.source, translation: c.translation })),
    });
    toast.success('Session saved!', { duration: 2500 });
  }, [chunks, sourceLang, targetLang]);

  const handleTtsToggle = useCallback(() => {
    setTtsEnabled(prev => {
      if (prev) ttsStop();
      return !prev;
    });
  }, [setTtsEnabled, ttsStop]);

  const handleOnboardingComplete = useCallback(({ source, target }) => {
    setSourceLang(source || 'en');
    setTargetLang(target || 'uz');
    setOnboardingDone(true);
  }, []);

  const handleAdminChange = useCallback((isAdmin) => {
    setAdminMode(isAdmin);
    setUsage(getUsage());
    if (!isAdmin && isLimitReached()) setLimitModalOpen(true);
    else if (isAdmin) setLimitModalOpen(false);
  }, []);

  // ── Onboarding screen ────────────────────────────────────────────────────────
  if (!onboardingDone) {
    return (
      <>
        <Onboarding onComplete={handleOnboardingComplete} />
        <ToastContainer />
      </>
    );
  }

  // ── Main UI ──────────────────────────────────────────────────────────────────
  return (
    <div className="lt-app">

      {/* Animated gradient background */}
      <AnimatedBackground />

      {/* ── Header ── */}
      <Header onSettingsClick={() => setSettingsOpen(true)} onHistoryClick={() => setHistoryOpen(true)} />

      {/* ── Language selector bar ── */}
      <LanguageBar
        sourceLang={sourceLang}
        targetLang={targetLang}
        onSwap={handleSwapLangs}
        onSourceChange={handleSourceChange}
        onTargetChange={handleTargetChange}
      />

      {/* ── Dual transcript panels (original + translation) ── */}
      <TranscriptPanel
        chunks={chunks}
        currentOriginal={currentOriginal}
        currentTranslation={currentTranslation}
        isTranslating={isTranslating}
        sourceLang={sourceLang}
        targetLang={targetLang}
        onClear={handleClear}
      />

      {/* ── Mic button + waveform bar ── */}
      <BottomBar status={status} onToggleMic={handleToggleMic} />

      {/* ── Status / info bar ── */}
      <StatusBar
        status={status}
        latency={lastLatency}
        chunkCount={chunks.length}
        isSpeaking={isSpeaking}
        usingElevenLabs={false}
        onSave={handleSaveSession}
        usage={usage}
        adminMode={adminMode}
      />

      {/* ── History modal ── */}
      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />

      {/* ── Daily limit modal (blocking) ── */}
      <LimitModal open={limitModalOpen} usage={usage} />

      {/* ── Microphone permission modal ── */}
      <PermissionModal
        open={permModalOpen}
        onClose={() => setPermModalOpen(false)}
        onRetry={startListening}
        errorType={permModalType}
      />

      {/* ── Toast notifications ── */}
      <ToastContainer />

      {/* ── Settings drawer (ControlPanel) ── */}
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <ControlPanel
          isListening={isListening}
          onToggleMic={handleToggleMic}
          status={status}

          voices={availableVoices}
          selectedVoice={selectedVoiceName}

          ttsEnabled={ttsEnabled}
          onTtsToggle={handleTtsToggle}
          ttsRate={ttsRate}
          ttsVolume={ttsVolume}

          showText={true}
          onTextToggle={() => {}}

          theme={theme}
          onThemeToggle={handleThemeToggle}

          onAdminChange={handleAdminChange}
          isAdminMode={adminMode}
        />
      </SettingsDrawer>

    </div>
  );
}
