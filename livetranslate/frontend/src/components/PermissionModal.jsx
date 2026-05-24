import { useEffect } from 'react';

function detectBrowser() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua))                                            return 'edge';
  if (/Chrome\//.test(ua) && /Google Inc/.test(navigator.vendor)) return 'chrome';
  if (/Firefox\//.test(ua))                                        return 'firefox';
  if (/Safari\//.test(ua) && !/Chrome/.test(ua))                  return 'safari';
  return 'other';
}

const CONFIG = {
  'not-allowed': {
    icon:  '🎤',
    title: 'Microphone access required',
    desc:  'LiveTranslate needs microphone permission to hear and translate your voice.',
    steps: {
      chrome:  [
        'Click the 🔒 icon on the left side of the address bar',
        'Change "Microphone" from blocked to "Allow"',
        'Refresh the page (F5 or Ctrl+R)',
      ],
      edge:    [
        'Click the 🔒 icon on the left side of the address bar',
        'Change the "Microphone" permission to "Allow"',
        'Refresh the page (F5)',
      ],
      firefox: [
        'Click the shield icon on the left side of the address bar',
        'Go to "Permissions" → click "×" next to the microphone row',
        'Refresh the page and grant permission again',
      ],
      safari:  [
        'Safari → Settings (⌘,) → Websites → Microphone',
        'Find the LiveTranslate site and select "Allow"',
        'Refresh the page (⌘R)',
      ],
      other:   [
        'Allow microphone access for this site in your browser settings',
        'Refresh the page and try again',
      ],
    },
  },

  'audio-capture': {
    icon:  '🎙',
    title: 'No microphone found',
    desc:  'No active microphone was detected on your device, or it is being used by another app.',
    steps: {
      chrome:  [
        'Make sure your microphone is connected to the computer',
        'Check that no other app (Zoom, Teams, etc.) is using the microphone',
        'Verify the microphone appears in Device Manager',
        'Try again',
      ],
      edge:    [
        'Make sure your microphone is connected',
        'Check Windows Settings → Privacy → Microphone',
        'Try again',
      ],
      firefox: [
        'Make sure your microphone is connected',
        'Check that no other app is using the microphone',
        'Refresh the page and try again',
      ],
      safari:  [
        'Make sure your microphone is connected',
        'Check that no other app is using the microphone',
        'Refresh the page and try again',
      ],
      other:   [
        'Check your microphone device',
        'Refresh the page and try again',
      ],
    },
  },
};

export function PermissionModal({ open, onClose, onRetry, errorType = 'not-allowed' }) {
  const browser = detectBrowser();
  const cfg     = CONFIG[errorType] ?? CONFIG['not-allowed'];
  const steps   = cfg.steps[browser] ?? cfg.steps.other;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position:       'fixed', inset: 0,
          background:     'rgba(10,10,30,0.72)',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          zIndex:         110,
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="perm-title"
        style={{
          position:   'fixed',
          top:        '50%',
          left:       '50%',
          transform:  'translate(-50%, -50%)',
          zIndex:     111,
          width:      'min(92vw, 420px)',
          background: 'var(--color-surface, #252545)',
          border:     '1px solid var(--color-border, rgba(255,255,255,0.12))',
          borderRadius: 20,
          padding:    '28px 24px 22px',
          boxShadow:  '0 32px 80px rgba(0,0,0,0.55)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 44, lineHeight: 1.1, marginBottom: 10 }}>{cfg.icon}</div>
          <h2
            id="perm-title"
            style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 600, color: 'var(--fg-1, #e8e8f0)' }}
          >
            {cfg.title}
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3, #888)', lineHeight: 1.55 }}>
            {cfg.desc}
          </p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
          borderRadius: 12,
          padding: '14px 16px',
          marginBottom: 18,
        }}>
          <p style={{
            margin: '0 0 10px',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--fg-3, #888)',
          }}>
            How to fix
          </p>
          <ol style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {steps.map((step, i) => (
              <li key={i} style={{ fontSize: 13, color: 'var(--fg-2, #b0b0c8)', lineHeight: 1.55 }}>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px 0',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
              borderRadius: 10, color: 'var(--fg-2, #b0b0c8)',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            Close
          </button>

          {onRetry && (
            <button
              onClick={() => { onClose(); setTimeout(onRetry, 50); }}
              style={{
                flex: 2, padding: '10px 0',
                background: 'var(--color-accent, #5B4FD4)',
                border: 'none', borderRadius: 10,
                color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </>
  );
}
