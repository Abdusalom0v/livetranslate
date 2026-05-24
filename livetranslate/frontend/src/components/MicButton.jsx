function MicIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3"></rect>
      <path d="M5 10v2a7 7 0 0 0 14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="22"></line>
      <line x1="8"  y1="22" x2="16" y2="22"></line>
    </svg>
  );
}

/**
 * MicButton
 * @param {'idle'|'listening'|'processing'|'error'} status
 * @param {number} size  — px, default 64
 */
export function MicButton({ status = 'idle', size = 64, onClick, ariaLabel }) {
  const showRipples = status === 'listening';
  return (
    <button
      type="button"
      className={`lt-mic lt-mic--${status}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      aria-label={ariaLabel || `Microphone: ${status}`}
      data-status={status}
    >
      {showRipples && <span className="lt-mic__ring"></span>}
      {showRipples && <span className="lt-mic__ring"></span>}
      {showRipples && <span className="lt-mic__ring"></span>}
      <span className="lt-mic__inner">
        <MicIcon className="lt-mic__icon" />
      </span>
    </button>
  );
}
