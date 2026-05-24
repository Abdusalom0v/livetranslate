import { useState, useEffect } from 'react';

// ── Singleton store (no React context needed) ─────────────────────────────────
const _listeners = new Set();
let _idCounter = 0;
let _toasts = [];

function _notify() {
  const snapshot = [..._toasts];
  _listeners.forEach(fn => fn(snapshot));
}

function _add({ type, message, duration }) {
  const id = ++_idCounter;
  _toasts = [..._toasts, { id, type, message }];
  _notify();
  if (duration > 0) {
    setTimeout(() => _remove(id), duration);
  }
  return id;
}

function _remove(id) {
  _toasts = _toasts.filter(t => t.id !== id);
  _notify();
}

// ── Imperative API — import { toast } and call toast.error('msg') ─────────────
export const toast = {
  error:   (msg, opts = {}) => _add({ type: 'error',   message: msg, duration: opts.duration ?? 6000 }),
  warn:    (msg, opts = {}) => _add({ type: 'warning', message: msg, duration: opts.duration ?? 5000 }),
  info:    (msg, opts = {}) => _add({ type: 'info',    message: msg, duration: opts.duration ?? 4000 }),
  success: (msg, opts = {}) => _add({ type: 'success', message: msg, duration: opts.duration ?? 3000 }),
  dismiss: (id)             => _remove(id),
};

// ── Per-type visual config ────────────────────────────────────────────────────
const TYPE_CFG = {
  error:   { icon: '✕', color: '#e05252', bg: 'rgba(224,82,82,0.13)',   border: 'rgba(224,82,82,0.35)'   },
  warning: { icon: '⚠', color: '#e0a84a', bg: 'rgba(224,168,74,0.13)', border: 'rgba(224,168,74,0.35)'  },
  info:    { icon: 'ℹ', color: '#7F77DD', bg: 'rgba(127,119,221,0.13)',border: 'rgba(127,119,221,0.35)' },
  success: { icon: '✓', color: '#4ade80', bg: 'rgba(74,222,128,0.13)', border: 'rgba(74,222,128,0.35)'  },
};

// ── Single item ───────────────────────────────────────────────────────────────
function ToastItem({ id, type, message }) {
  const [visible, setVisible] = useState(false);
  const cfg = TYPE_CFG[type] ?? TYPE_CFG.info;

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        display:       'flex',
        alignItems:    'flex-start',
        gap:           10,
        padding:       '12px 14px',
        background:    cfg.bg,
        border:        `1px solid ${cfg.border}`,
        borderRadius:  12,
        boxShadow:     '0 4px 24px rgba(0,0,0,0.4)',
        backdropFilter:'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        width:         '100%',
        pointerEvents: 'auto',
        opacity:       visible ? 1 : 0,
        transform:     visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
        transition:    'opacity 220ms ease, transform 220ms ease',
      }}
    >
      {/* Type icon */}
      <span style={{
        fontSize: 13, fontWeight: 700, color: cfg.color,
        lineHeight: '20px', flexShrink: 0, minWidth: 16, textAlign: 'center',
      }}>
        {cfg.icon}
      </span>

      {/* Message */}
      <span style={{
        flex: 1, fontSize: 13, lineHeight: 1.5,
        color: 'var(--fg-1, #e8e8f0)',
        wordBreak: 'break-word',
      }}>
        {message}
      </span>

      {/* Dismiss button */}
      <button
        onClick={() => _remove(id)}
        aria-label="Dismiss"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '0 0 0 6px', color: 'var(--fg-3, #888)',
          fontSize: 17, lineHeight: '20px', flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ── Container — render once near the bottom of the tree ──────────────────────
export function ToastContainer() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    _listeners.add(setItems);
    setItems([..._toasts]);
    return () => _listeners.delete(setItems);
  }, []);

  if (!items.length) return null;

  return (
    <div
      aria-label="Bildirishnomalar"
      style={{
        position:      'fixed',
        bottom:        'max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px))',
        left:          '50%',
        transform:     'translateX(-50%)',
        zIndex:        200,
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'stretch',
        gap:           8,
        pointerEvents: 'none',
        width:         'min(92vw, 380px)',
      }}
    >
      {items.map(item => (
        <ToastItem key={item.id} {...item} />
      ))}
    </div>
  );
}
