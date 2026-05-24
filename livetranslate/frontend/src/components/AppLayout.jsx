import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatedBackground } from './AnimatedBackground.jsx';
import { MicButton }          from './MicButton.jsx';
import { TranscriptPanel }    from './TranscriptPanel.jsx';
import { ControlPanel }       from './ControlPanel.jsx';
import {
  IconSettings, IconHistory, IconChevron, IconSwap,
  IconHeadphones, IconVolume, IconSave, IconSparkles,
} from './Icons.jsx';
import { SUPPORTED_LANGS } from '../hooks/useTTS.js';

const SAMPLE_CHUNKS = [
  { source: "Today we'll talk about photosynthesis.",         translation: "Bugun fotosintez haqida gaplashamiz.",                     time: '14:21' },
  { source: "Plants take in carbon dioxide from the air.",   translation: "O'simliklar havodan karbonat angidridni oladi.",            time: '14:22' },
  { source: "The green pigment is called chlorophyll.",      translation: "Yashil pigment xlorofil deb ataladi.",                      time: '14:22' },
  { source: "It absorbs sunlight, mostly red and blue wavelengths.", translation: "U quyosh nurini, asosan qizil va ko'k to'lqinlarni yutadi.", time: '14:23' },
];

// ── Waveform (3 sinus to'lqin, Siri uslubida) ─────────────────────────────
function Waveform({ active }) {
  const w1 = useRef(null), w2 = useRef(null), w3 = useRef(null);
  const SAMPLES = 64, WIDTH = 600, HEIGHT = 56, MID = HEIGHT / 2;

  useEffect(() => {
    if (!active) {
      [w1, w2, w3].forEach(r => r.current?.setAttribute('d', `M0 ${MID} L${WIDTH} ${MID}`));
      return;
    }
    let raf, t = 0;
    const envelope = (time) => {
      const slow = 0.5 + 0.35 * Math.sin(time * 0.0008);
      const med  = 0.5 + 0.30 * Math.sin(time * 0.003 + 1.7);
      const fast = 0.5 + 0.45 * Math.sin(time * 0.012 + 3.3);
      let a = slow * 0.55 + med * 0.30 + fast * 0.35;
      const gate = (Math.sin(time * 0.0006) + 0.7);
      a *= Math.max(0.15, Math.min(1, gate));
      return Math.max(0.08, Math.min(1, a));
    };
    const path = (time, amp, phase, freq) => {
      let d = '';
      for (let i = 0; i <= SAMPLES; i++) {
        const x = (i / SAMPLES) * WIDTH;
        const tau = i / SAMPLES;
        const win = Math.sin(tau * Math.PI);
        const y = MID
          + Math.sin(tau * Math.PI * freq + time * 0.005 + phase) * 12 * amp * win
          + Math.sin(tau * Math.PI * (freq * 1.7) - time * 0.003 + phase * 1.3) * 6 * amp * win;
        d += (i === 0 ? 'M ' : ' L ') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      return d;
    };
    const tick = () => {
      t += 16;
      const amp = envelope(t);
      if (w1.current) w1.current.setAttribute('d', path(t, amp,        0,   5));
      if (w2.current) w2.current.setAttribute('d', path(t, amp * 0.78, 1.2, 7));
      if (w3.current) w3.current.setAttribute('d', path(t, amp * 0.55, 2.4, 9));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, MID]);

  return (
    <svg className={`lt-flow ${active ? '' : 'lt-flow--idle'}`}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="ltflow-grad" x1="0" x2="1">
          <stop offset="0"  stopColor="#7F77DD" />
          <stop offset=".5" stopColor="#9B91F2" />
          <stop offset="1"  stopColor="#7F77DD" />
        </linearGradient>
      </defs>
      <path ref={w3} className="lt-flow__path lt-flow__path--3" d={`M0 ${MID}`} />
      <path ref={w2} className="lt-flow__path lt-flow__path--2" d={`M0 ${MID}`} />
      <path ref={w1} className="lt-flow__path lt-flow__path--1" d={`M0 ${MID}`} stroke="url(#ltflow-grad)" />
    </svg>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────
function Header({ onSettingsClick }) {
  return (
    <header className="lt-header">
      <div className="lt-logo">
        <div className="lt-logo__mark"><IconSparkles size={18} strokeWidth={2} /></div>
        LiveTranslate
        <span className="lt-pill">BETA</span>
      </div>
      <div className="lt-header__actions">
        <button className="lt-iconbtn" aria-label="History"><IconHistory /></button>
        <button className="lt-iconbtn" aria-label="Settings" onClick={onSettingsClick}>
          <IconSettings />
        </button>
      </div>
    </header>
  );
}

// ── Settings drawer ────────────────────────────────────────────────────────
function SettingsDrawer({ open, onClose, children }) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:   'fixed', inset: 0,
          background: 'rgba(10,10,30,0.55)',
          backdropFilter: 'blur(3px)',
          zIndex:     50,
          opacity:    open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 220ms var(--ease-out)',
        }}
      />
      {/* Panel */}
      <div
        style={{
          position:   'fixed', top: 0, right: 0, bottom: 0,
          width:      340,
          maxWidth:   '92vw',
          zIndex:     51,
          transform:  open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 260ms var(--ease-out)',
          overflowY:  'auto',
          padding:    'var(--sp-4)',
          background: 'var(--color-bg)',
          borderLeft: '1px solid var(--color-border)',
          boxShadow:  '-8px 0 40px rgba(0,0,0,0.35)',
        }}
        aria-hidden={!open}
      >
        {/* Close button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--sp-3)' }}>
          <button
            className="lt-iconbtn"
            onClick={onClose}
            aria-label="Close"
            style={{ fontSize: 20, width: 36, height: 36 }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

// ── Language bar ───────────────────────────────────────────────────────────
function LangBar({ source, target, onSwap }) {
  return (
    <div className="lt-langbar">
      <button className="lt-lang">
        <span className="lt-lang__flag">{source.flag}</span>
        {source.name}
        <IconChevron size={16} />
      </button>
      <button className="lt-lang__swap" aria-label="Swap languages" onClick={onSwap}>
        <IconSwap size={18} />
      </button>
      <button className="lt-lang lt-lang--right">
        <span className="lt-lang__flag">{target.flag}</span>
        {target.name}
        <IconChevron size={16} />
      </button>
    </div>
  );
}

// ── Controls bar ───────────────────────────────────────────────────────────
function ControlsBar({ status, onToggle }) {
  return (
    <div className="lt-controls">
      <div className="lt-controls__mic">
        <MicButton status={status} size={64} onClick={onToggle} />
      </div>
      <Waveform active={status === 'listening'} />
      <div className="lt-controls__spacer" />
      <button className="lt-control-btn"><IconHeadphones size={16} /> Built-in mic <IconChevron size={14} /></button>
      <button className="lt-control-btn"><IconVolume size={16} /> Voice off <IconChevron size={14} /></button>
      <button className="lt-control-btn lt-control-btn--active">
        <span style={{ width: 8, height: 8, borderRadius: 999, background: 'currentColor' }} />
        Auto-scroll
      </button>
      <button className="lt-control-btn lt-control-btn--toggle" title="Projector mode">
        <IconSparkles size={16} />
      </button>
    </div>
  );
}

// ── Status bar ─────────────────────────────────────────────────────────────
function StatusBar({ status, latency, chunkCount }) {
  const isRec = status === 'listening';
  return (
    <div className="lt-statusbar">
      <span className={`lt-status-rec ${isRec ? '' : 'lt-status-rec--ready'}`}>
        <span className="lt-status-rec__dot" />
        {isRec ? 'Recording' : 'Ready'}
      </span>
      {latency ? <span className="lt-status-latency">~{(latency / 1000).toFixed(1)}s</span> : null}
      <span className="lt-status-latency" style={{ color: 'var(--fg-3)' }}>
        {chunkCount} chunks
      </span>
      <div className="lt-statusbar__spacer" />
      <button className="lt-save-btn"><IconSave size={16} /> Save</button>
    </div>
  );
}

// ── Main AppLayout ─────────────────────────────────────────────────────────
export function AppLayout({
  chunks             = [],
  currentOriginal    = '',
  currentTranslation = '',
  isTranslating      = false,
  status             = 'idle',   // 'idle'|'listening'|'processing'|'error'
  sourceLang         = 'en',
  targetLang         = 'uz',
  latency            = null,
  onToggleMic,
  onSwapLangs,
  onClear,
  demoMode           = false,
  // TTS / ControlPanel props
  voices             = [],
  selectedVoice      = '',
  onVoiceChange,
  ttsEnabled         = true,
  onTtsToggle,
  ttsRate            = 1.0,
  onRateChange,
  ttsVolume          = 1.0,
  onVolumeChange,
  isSpeaking         = false,
  elevenAvailable    = false,
  useEleven          = false,
  onElevenToggle,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSettings  = useCallback(() => setSettingsOpen(true),  []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  // Close settings drawer on ESC
  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e) => { if (e.key === 'Escape') closeSettings(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [settingsOpen, closeSettings]);

  const source = SUPPORTED_LANGS.find(l => l.code === sourceLang) || SUPPORTED_LANGS[0];
  const target = SUPPORTED_LANGS.find(l => l.code === targetLang) || SUPPORTED_LANGS[1];

  // Demo: namuna chunklarni simulate qilamiz
  const [demoChunks, setDemoChunks]                         = useState([]);
  const [demoCurrentOriginal, setDemoCurrentOriginal]       = useState('');
  const [demoCurrentTranslation, setDemoCurrentTranslation] = useState('');
  const [demoIsTranslating, setDemoIsTranslating]           = useState(false);

  useEffect(() => {
    if (!demoMode) {
      setDemoChunks(SAMPLE_CHUNKS.slice(0, 3).map((c, i) => ({ ...c, id: i })));
      return;
    }
    if (status !== 'listening') return;
    let cancelled = false;
    const id = setTimeout(() => {
      if (cancelled) return;
      const incoming = SAMPLE_CHUNKS[3];
      const words = incoming.source.split(' ');
      let i = 0;
      setDemoCurrentOriginal('');
      setDemoIsTranslating(false);
      const typer = setInterval(() => {
        if (cancelled) return clearInterval(typer);
        i++;
        setDemoCurrentOriginal(words.slice(0, i).join(' '));
        if (i === Math.floor(words.length / 2)) setDemoIsTranslating(true);
        if (i >= words.length) {
          clearInterval(typer);
          setTimeout(() => {
            if (cancelled) return;
            setDemoCurrentTranslation(incoming.translation);
            setDemoIsTranslating(false);
            setTimeout(() => {
              if (cancelled) return;
              setDemoChunks(prev => [...prev, { ...incoming, id: prev.length }]);
              setDemoCurrentOriginal('');
              setDemoCurrentTranslation('');
            }, 600);
          }, 800);
        }
      }, 220);
    }, 1200);
    return () => { cancelled = true; clearTimeout(id); };
  }, [demoMode, status]);

  const tp_chunks             = demoMode ? demoChunks             : chunks;
  const tp_currentOriginal    = demoMode ? demoCurrentOriginal    : currentOriginal;
  const tp_currentTranslation = demoMode ? demoCurrentTranslation : currentTranslation;
  const tp_isTranslating      = demoMode ? demoIsTranslating      : isTranslating;

  return (
    <div className="lt-app">
      <AnimatedBackground />
      <Header onSettingsClick={openSettings} />
      <LangBar source={source} target={target} onSwap={onSwapLangs} />

      <TranscriptPanel
        chunks={tp_chunks}
        currentOriginal={tp_currentOriginal}
        currentTranslation={tp_currentTranslation}
        isTranslating={tp_isTranslating}
        sourceLang={sourceLang}
        targetLang={targetLang}
        onClear={onClear}
      />

      <ControlsBar status={status} onToggle={onToggleMic} />
      <StatusBar status={status} latency={latency} chunkCount={tp_chunks.length} />

      <SettingsDrawer open={settingsOpen} onClose={closeSettings}>
        <ControlPanel
          isListening={status === 'listening'}
          onToggleMic={onToggleMic}
          status={status}
          voices={voices}
          selectedVoice={selectedVoice}
          onVoiceChange={onVoiceChange}
          ttsEnabled={ttsEnabled}
          onTtsToggle={onTtsToggle}
          ttsRate={ttsRate}
          onRateChange={onRateChange}
          ttsVolume={ttsVolume}
          onVolumeChange={onVolumeChange}
          elevenAvailable={elevenAvailable}
          useEleven={useEleven}
          onElevenToggle={onElevenToggle}
          showText={true}
          onTextToggle={() => {}}
        />
      </SettingsDrawer>
    </div>
  );
}
