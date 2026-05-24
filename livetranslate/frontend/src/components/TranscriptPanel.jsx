import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { IconCopy, IconMic, IconHeadphones, IconTrash } from './Icons.jsx';
import { SUPPORTED_LANGS } from '../hooks/useTTS.js';

// Til kodidan {flag, name} oladi
function resolveLang(code, fallbackName) {
  const found = SUPPORTED_LANGS.find(l => l.code === code);
  return found ?? { flag: '', name: fallbackName };
}

// Latency ms → "1.2s" yoki "840ms"
function fmtLatency(ms) {
  if (ms == null) return null;
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

// ── Bitta chunk satri (tugallangan) ──────────────────────────────────────────
function HistoryChunk({ chunk, side }) {
  const text    = side === 'left' ? chunk.source : chunk.translation;
  const latency = side === 'right' ? fmtLatency(chunk.latency) : null;

  const handleCopy = () => navigator.clipboard?.writeText(text);

  return (
    <div className="lt-chunk">
      <span className="lt-chunk__time">{chunk.time}</span>
      <div className="lt-chunk__text">{text}</div>

      {latency && (
        <span style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      'var(--fs-2xs)',
          color:         'var(--color-success)',
          marginTop:     'var(--sp-1)',
          display:       'block',
          letterSpacing: 'var(--ls-wide)',
        }}>
          {latency}
        </span>
      )}

      <button
        className="lt-chunk__copy"
        aria-label="Copy"
        onClick={handleCopy}
      >
        <IconCopy size={14} />
      </button>
    </div>
  );
}

// ── Joriy yozilayotgan satr ───────────────────────────────────────────────────
function LiveChunk({ text, side, isTranslating }) {
  if (!text && !(side === 'right' && isTranslating)) return null;

  const showDots   = side === 'right' && isTranslating && !text;
  const showCursor = side === 'left';

  return (
    <div className="lt-chunk lt-chunk--active">
      <div className="lt-chunk__text">
        {text || (showDots ? null : '…')}

        {/* O'ng panel: tarjima kutilmoqda */}
        {showDots && (
          <span className="lt-dots" aria-label="Translating...">
            <span /><span /><span />
          </span>
        )}

        {/* Chap panel: yozilmoqda kursorlari */}
        {showCursor && text && (
          <span aria-hidden="true" style={{
            display:       'inline-block',
            width:         '2px',
            height:        '1.1em',
            background:    'var(--color-accent)',
            verticalAlign: 'text-bottom',
            marginLeft:    '3px',
            animation:     'lt-blink 1s steps(1) infinite',
          }} />
        )}
      </div>
    </div>
  );
}

// ── Panel wrapper ─────────────────────────────────────────────────────────────
function Panel({ lang, label, icon: Icon, children, scrollRef, isActive }) {
  return (
    <section
      className={`lt-panel${isActive ? ' is-active' : ''}`}
      aria-label={label}
    >
      <header className="lt-panel__head">
        <div className="lt-panel__title">
          <Icon size={16} strokeWidth={1.8} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          {lang.flag && (
            <span className="lt-lang__flag" aria-hidden="true" style={{ fontSize: 18 }}>
              {lang.flag}
            </span>
          )}
          <span style={{ fontWeight: 600 }}>{lang.name}</span>
          <span className="lt-label" style={{ marginLeft: 'var(--sp-2)' }}>{label}</span>
        </div>
      </header>

      {/* Top fade mask */}
      <div className="lt-panel__fade" aria-hidden="true" />

      <div className="lt-panel__scroll" ref={scrollRef}>
        {children}
      </div>
    </section>
  );
}

// ── Asosiy komponent ──────────────────────────────────────────────────────────
/**
 * TranscriptPanel — ikkita parallel panel (asl + tarjima).
 *
 * @param {Array}   chunks            — tugallangan chunklar [{id,source,translation,time,latency?}]
 * @param {string}  currentOriginal   — hozir yozilayotgan matn
 * @param {string}  currentTranslation— hozirgi tarjima (yoki bo'sh agar kutilayotgan bo'lsa)
 * @param {boolean} isTranslating     — tarjimon ishlayaptimi
 * @param {string}  sourceLang        — 2-harfli manba kodi ('en', 'hi', ...)
 * @param {string}  targetLang        — 2-harfli tarjima kodi ('uz', 'ru', ...)
 * @param {function} onClear          — tarix tozalash callback (ixtiyoriy)
 */
export function TranscriptPanel({
  chunks             = [],
  currentOriginal    = '',
  currentTranslation = '',
  isTranslating      = false,
  sourceLang         = 'en',
  targetLang         = 'uz',
  onClear,
}) {
  const [activeSide, setActiveSide] = useState('right');
  const leftRef  = useRef(null);
  const rightRef = useRef(null);

  const source = resolveLang(sourceLang, 'Original');
  const target = resolveLang(targetLang, 'Translation');

  // Auto-scroll — yangi mazmun kelganda
  useEffect(() => {
    const bottom = (ref) => {
      if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
    };
    bottom(leftRef);
    bottom(rightRef);
  }, [chunks.length, currentOriginal, currentTranslation]);

  const hasContent = chunks.length > 0 || currentOriginal;

  return (
    <>
      {/* Mobil tab tugmalari (faqat kichik ekranda ko'rinadi) */}
      <div className="lt-tabs" role="tablist" aria-label="Select panel">
        <button
          role="tab"
          aria-pressed={activeSide === 'left'}
          onClick={() => setActiveSide('left')}
        >
          {source.flag && <span className="flag">{source.flag}</span>}
          {source.name}
        </button>
        <button
          role="tab"
          aria-pressed={activeSide === 'right'}
          onClick={() => setActiveSide('right')}
        >
          {target.flag && <span className="flag">{target.flag}</span>}
          {target.name}
        </button>
      </div>

      {/* Ikkita panel */}
      <div className="lt-main">
        {/* Chap panel — asl gap */}
        <Panel
          lang={source}
          label="ORIGINAL"
          icon={IconMic}
          scrollRef={leftRef}
          isActive={activeSide === 'left'}
        >
          {chunks.map(c => (
            <HistoryChunk key={c.id} chunk={c} side="left" />
          ))}
          <LiveChunk text={currentOriginal} side="left" isTranslating={isTranslating} />
        </Panel>

        {/* O'ng panel — tarjima */}
        <Panel
          lang={target}
          label="TRANSLATION"
          icon={IconHeadphones}
          scrollRef={rightRef}
          isActive={activeSide === 'right'}
        >
          {chunks.map(c => (
            <HistoryChunk key={c.id} chunk={c} side="right" />
          ))}
          <LiveChunk text={currentTranslation} side="right" isTranslating={isTranslating} />
        </Panel>
      </div>

      {/* Tarix tozalash */}
      {hasContent && onClear && (
        <div style={{
          display:        'flex',
          justifyContent: 'center',
          padding:        'var(--sp-3) var(--sp-6)',
          borderTop:      '1px solid var(--color-divider)',
        }}>
          <button
            className="lt-save-btn"
            onClick={onClear}
            style={{ color: 'var(--fg-3)', gap: 'var(--sp-2)' }}
          >
            <IconTrash size={14} strokeWidth={1.6} />
            Clear history
          </button>
        </div>
      )}
    </>
  );
}

TranscriptPanel.propTypes = {
  chunks:             PropTypes.arrayOf(PropTypes.shape({
    id:          PropTypes.number.isRequired,
    source:      PropTypes.string.isRequired,
    translation: PropTypes.string.isRequired,
    time:        PropTypes.string.isRequired,
    latency:     PropTypes.number,
  })),
  currentOriginal:    PropTypes.string,
  currentTranslation: PropTypes.string,
  isTranslating:      PropTypes.bool,
  sourceLang:         PropTypes.string,
  targetLang:         PropTypes.string,
  onClear:            PropTypes.func,
};
