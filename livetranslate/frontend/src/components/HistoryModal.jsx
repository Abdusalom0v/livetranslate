import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { loadSessions, deleteSession, clearSessions } from '../utils/sessionStorage.js';
import { sessionToText, sessionToJSON, downloadFile, formatDuration } from '../utils/exportSession.js';

function wordCount(chunks) {
  return chunks.reduce((n, c) => n + c.source.trim().split(/\s+/).filter(Boolean).length, 0);
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Single chunk row in detail view ──────────────────────────────────────────
function ChunkRow({ chunk }) {
  const [copiedSide, setCopiedSide] = useState(null);

  const copy = (text, side) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedSide(side);
      setTimeout(() => setCopiedSide(null), 1500);
    });
  };

  return (
    <div style={{
      display:      'grid',
      gridTemplate: '1fr / 1fr 1fr',
      gap:          12,
      padding:      '10px 0',
      borderBottom: '1px solid var(--color-divider)',
    }}>
      {[['source', chunk.source], ['translation', chunk.translation]].map(([side, text]) => (
        <div key={side} style={{ position: 'relative', paddingRight: 28 }}>
          <span style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      'var(--fs-2xs)',
            color:         'var(--fg-3)',
            letterSpacing: 'var(--ls-wide)',
            display:       'block',
            marginBottom:  4,
          }}>
            {chunk.time} · {side === 'source' ? 'ORIGINAL' : 'TRANSLATION'}
          </span>
          <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--fg-1)', lineHeight: 1.5 }}>
            {text}
          </p>
          <button
            onClick={() => copy(text, side)}
            aria-label="Copy"
            style={{
              position:   'absolute',
              top:        0,
              right:      0,
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              color:      copiedSide === side ? 'var(--color-success)' : 'var(--fg-3)',
              fontSize:   13,
              padding:    2,
              transition: 'color 200ms',
            }}
          >
            {copiedSide === side ? '✓' : '⎘'}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Session card in list view ─────────────────────────────────────────────────
function SessionCard({ session, onView, onDelete }) {
  const words = wordCount(session.chunks);

  return (
    <div style={{
      background:   'var(--color-surface)',
      border:       '1px solid var(--color-border)',
      borderRadius: 12,
      padding:      '14px 16px',
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg-1)', fontWeight: 600, marginBottom: 4 }}>
            {session.langs.source.toUpperCase()} → {session.langs.target.toUpperCase()}
          </div>
          <div style={{
            fontSize:      'var(--fs-xs)',
            color:         'var(--fg-3)',
            fontFamily:    'var(--font-mono)',
            letterSpacing: 'var(--ls-wide)',
          }}>
            {fmtDate(session.date)} · {formatDuration(session.duration)} · {session.chunks.length} chunks · {words} words
          </div>
        </div>

        <button
          onClick={() => onDelete(session.id)}
          aria-label="Delete"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--fg-3)', fontSize: 16, padding: 4, flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => onView(session)}
          style={btnStyle('var(--color-accent)')}
        >
          View
        </button>
        <button
          onClick={() => downloadFile(sessionToText(session), `session-${session.id}.txt`)}
          style={btnStyle('var(--fg-2)')}
        >
          TXT
        </button>
        <button
          onClick={() => downloadFile(sessionToJSON(session), `session-${session.id}.json`, 'application/json')}
          style={btnStyle('var(--fg-2)')}
        >
          JSON
        </button>
      </div>
    </div>
  );
}

function btnStyle(color) {
  return {
    background:   'none',
    border:       `1px solid ${color}`,
    borderRadius: 8,
    color,
    fontSize:     'var(--fs-xs)',
    padding:      '5px 12px',
    cursor:       'pointer',
    fontFamily:   'var(--font-sans)',
  };
}

// ── Main HistoryModal ─────────────────────────────────────────────────────────
export function HistoryModal({ open, onClose }) {
  const [sessions, setSessions]     = useState([]);
  const [selected, setSelected]     = useState(null); // session object for detail view

  // Reload sessions each time modal opens
  useEffect(() => {
    if (open) {
      setSessions(loadSessions());
      setSelected(null);
    }
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // ESC key
  useEffect(() => {
    if (!open) return;
    const handle = (e) => { if (e.key === 'Escape') { selected ? setSelected(null) : onClose(); } };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open, selected, onClose]);

  const handleDelete = (id) => {
    deleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const handleClearAll = () => {
    clearSessions();
    setSessions([]);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:       'fixed', inset: 0,
          background:     'rgba(10,10,30,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex:         60,
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Translation History"
        aria-modal="true"
        style={{
          position:   'fixed',
          top:        '50%',
          left:       '50%',
          transform:  'translate(-50%,-50%)',
          zIndex:     61,
          width:      'min(680px, 94vw)',
          maxHeight:  '80vh',
          display:    'flex',
          flexDirection: 'column',
          background: 'var(--color-bg)',
          border:     '1px solid var(--color-border)',
          borderRadius: 16,
          boxShadow:  '0 24px 64px rgba(0,0,0,0.55)',
          overflow:   'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display:       'flex',
          alignItems:    'center',
          justifyContent:'space-between',
          padding:       '16px 20px',
          borderBottom:  '1px solid var(--color-divider)',
          flexShrink:    0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {selected && (
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-accent)', fontSize: 20, padding: '0 4px',
                  lineHeight: 1,
                }}
                aria-label="Back"
              >
                ←
              </button>
            )}
            <span style={{ fontWeight: 700, fontSize: 'var(--fs-base)', color: 'var(--fg-1)' }}>
              {selected ? `${selected.langs.source.toUpperCase()} → ${selected.langs.target.toUpperCase()} · ${fmtDate(selected.date)}` : 'Translation History'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!selected && sessions.length > 0 && (
              <button
                onClick={handleClearAll}
                style={{ ...btnStyle('var(--fg-3)'), fontSize: 'var(--fs-2xs)' }}
              >
                Clear all
              </button>
            )}
            {selected && (
              <>
                <button
                  onClick={() => downloadFile(sessionToText(selected), `session-${selected.id}.txt`)}
                  style={{ ...btnStyle('var(--fg-2)'), fontSize: 'var(--fs-2xs)' }}
                >
                  TXT
                </button>
                <button
                  onClick={() => downloadFile(sessionToJSON(selected), `session-${selected.id}.json`, 'application/json')}
                  style={{ ...btnStyle('var(--fg-2)'), fontSize: 'var(--fs-2xs)' }}
                >
                  JSON
                </button>
              </>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--fg-2)', fontSize: 22, width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>
          {selected ? (
            // Detail view
            selected.chunks.length === 0 ? (
              <p style={{ color: 'var(--fg-3)', fontSize: 'var(--fs-sm)', textAlign: 'center', marginTop: 40 }}>
                No chunks in this session.
              </p>
            ) : (
              selected.chunks.map(c => <ChunkRow key={c.id} chunk={c} />)
            )
          ) : sessions.length === 0 ? (
            // Empty state
            <div style={{ textAlign: 'center', color: 'var(--fg-3)', marginTop: 60 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              <p style={{ fontSize: 'var(--fs-sm)', margin: 0 }}>
                No saved sessions yet.<br />
                Press "Save" to save the current session.
              </p>
            </div>
          ) : (
            // Session list
            sessions.map(s => (
              <SessionCard
                key={s.id}
                session={s}
                onView={setSelected}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

HistoryModal.propTypes = {
  open:    PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
