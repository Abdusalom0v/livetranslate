import { useState, useEffect } from 'react'

function getTimeUntilMidnight() {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const diff = midnight - now
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1_000)
  return { h, m, s, total: diff }
}

export function LimitModal({ open, usage }) {
  const [timeLeft, setTimeLeft] = useState(getTimeUntilMidnight)

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setTimeLeft(getTimeUntilMidnight()), 1000)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  const pad = (n) => String(n).padStart(2, '0')

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Icon */}
        <div style={styles.iconWrap}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Title */}
        <h2 style={styles.title}>Kunlik limit tugadi</h2>

        {/* Subtitle */}
        <p style={styles.subtitle}>
          Bugun <strong style={{ color: 'var(--fg-1)' }}>{usage?.limit ?? 5} ta</strong> sessiyadan foydalandingiz
        </p>

        {/* Timer */}
        <div style={styles.timerBox}>
          <span style={styles.timerLabel}>Yangilanishga</span>
          <div style={styles.timerDisplay}>
            <span style={styles.timerUnit}>
              <span style={styles.timerNum}>{pad(timeLeft.h)}</span>
              <span style={styles.timerSub}>soat</span>
            </span>
            <span style={styles.timerSep}>:</span>
            <span style={styles.timerUnit}>
              <span style={styles.timerNum}>{pad(timeLeft.m)}</span>
              <span style={styles.timerSub}>daqiqa</span>
            </span>
            <span style={styles.timerSep}>:</span>
            <span style={styles.timerUnit}>
              <span style={styles.timerNum}>{pad(timeLeft.s)}</span>
              <span style={styles.timerSub}>soniya</span>
            </span>
          </div>
        </div>

        {/* CTA */}
        <a
          href="mailto:maxliyosaidova515@gmail.com?subject=LiveTranslate%20Premium"
          style={styles.ctaBtn}
        >
          Biz bilan bog&apos;laning
        </a>

        <p style={styles.hint}>
          Cheksiz foydalanish uchun premium versiyaga o&apos;ting
        </p>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position:        'fixed',
    inset:           0,
    zIndex:          9999,
    background:      'rgba(8, 8, 24, 0.80)',
    backdropFilter:  'blur(8px)',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         '24px 16px',
  },

  card: {
    background:    'var(--color-card)',
    border:        '1px solid var(--color-border-strong)',
    borderRadius:  'var(--r-lg)',
    boxShadow:     'var(--shadow-lg)',
    padding:       '40px 36px 32px',
    maxWidth:      420,
    width:         '100%',
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           16,
    textAlign:     'center',
  },

  iconWrap: {
    width:        64,
    height:       64,
    borderRadius: '50%',
    background:   'rgba(239, 68, 68, 0.12)',
    border:       '1px solid rgba(239, 68, 68, 0.25)',
    display:      'grid',
    placeItems:   'center',
    color:        '#EF4444',
    marginBottom: 4,
  },

  title: {
    fontSize:      'var(--fs-xl)',
    fontWeight:    'var(--fw-bold)',
    color:         'var(--fg-1)',
    margin:        0,
    letterSpacing: 'var(--ls-tight)',
  },

  subtitle: {
    fontSize:   'var(--fs-sm)',
    color:      'var(--fg-2)',
    margin:     0,
    lineHeight: 1.5,
  },

  timerBox: {
    background:    'var(--color-surface-2)',
    border:        '1px solid var(--color-border)',
    borderRadius:  'var(--r-md)',
    padding:       '16px 28px',
    width:         '100%',
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           8,
    marginTop:     4,
  },

  timerLabel: {
    fontSize:      'var(--fs-2xs)',
    fontWeight:    700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    color:         'var(--fg-3)',
  },

  timerDisplay: {
    display:    'flex',
    alignItems: 'center',
    gap:        4,
  },

  timerUnit: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           2,
  },

  timerNum: {
    fontFamily:    'var(--font-mono)',
    fontSize:      28,
    fontWeight:    700,
    color:         'var(--fg-1)',
    lineHeight:    1,
  },

  timerSub: {
    fontSize:      10,
    color:         'var(--fg-3)',
    letterSpacing: '0.05em',
  },

  timerSep: {
    fontFamily: 'var(--font-mono)',
    fontSize:   24,
    fontWeight: 700,
    color:      'var(--fg-3)',
    marginBottom: 12,
  },

  ctaBtn: {
    display:        'inline-flex',
    alignItems:     'center',
    justifyContent: 'center',
    width:          '100%',
    padding:        '12px 24px',
    borderRadius:   'var(--r-md)',
    background:     'linear-gradient(135deg, var(--color-accent), var(--orb-violet))',
    color:          '#fff',
    fontSize:       'var(--fs-sm)',
    fontWeight:     'var(--fw-semibold)',
    textDecoration: 'none',
    transition:     'opacity 150ms',
    cursor:         'pointer',
    boxShadow:      'var(--glow-accent)',
    marginTop:      4,
  },

  hint: {
    fontSize: 'var(--fs-xs)',
    color:    'var(--fg-3)',
    margin:   0,
  },
}
