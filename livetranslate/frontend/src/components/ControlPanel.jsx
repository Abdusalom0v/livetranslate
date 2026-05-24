import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { MicButton } from './MicButton.jsx';
import { IconMic, IconHeadphones, IconVolume, IconSun, IconMoon } from './Icons.jsx';
import { BASE_URL } from '../utils/api.js';
import { setAdminMode, resetUsage } from '../utils/usageLimit.js';

// ── Device loading ────────────────────────────────────────────────────────────
async function loadDevices() {
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    if (all.every(d => !d.label)) {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return navigator.mediaDevices.enumerateDevices();
    }
    return all;
  } catch {
    return [];
  }
}

const ALLOWED_MODELS = [
  { value: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash — Aqlli'    },
  { value: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash — Barqaror' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite — Tez' },
];

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ children }) {
  return (
    <div style={s.sectionHead}>
      <span style={s.sectionTitle}>{children}</span>
    </div>
  );
}

// ── Setting row ───────────────────────────────────────────────────────────────
function SettingRow({ icon: Icon, label, children }) {
  return (
    <div style={s.settingRow}>
      {Icon && (
        <span style={s.settingIcon}>
          <Icon size={14} strokeWidth={1.8} />
        </span>
      )}
      <span style={s.settingLabel}>{label}</span>
      <div style={s.settingControl}>{children}</div>
    </div>
  );
}

// ── Styled select ─────────────────────────────────────────────────────────────
function StyledSelect({ value, onChange, options, placeholder, disabled }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={{ ...s.select, opacity: disabled ? 0.65 : 1 }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ── Pill switch ───────────────────────────────────────────────────────────────
function PillSwitch({ active, onToggle, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={ariaLabel}
      onClick={onToggle}
      style={{
        ...s.pillSwitch,
        background:  active ? 'var(--color-accent)' : 'var(--color-surface-2)',
        borderColor: active ? 'var(--color-accent)' : 'var(--color-border-strong)',
      }}
    >
      <span style={{
        ...s.pillThumb,
        transform: active ? 'translateX(18px)' : 'translateX(0)',
        background: active ? '#fff' : 'var(--fg-3)',
      }} />
    </button>
  );
}

// ── Key selector buttons ──────────────────────────────────────────────────────
function KeyButton({ n, active, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        ...s.keyBtn,
        background:  active ? 'var(--color-accent)' : 'var(--color-surface-2)',
        borderColor: active ? 'var(--color-accent)' : 'var(--color-border)',
        color:       active ? '#fff' : 'var(--fg-2)',
        opacity:     disabled && !active ? 0.55 : 1,
        cursor:      disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {active && (
        <span style={{
          width: 6, height: 6,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.85)',
          flexShrink: 0,
        }} />
      )}
      Key {n}
    </button>
  );
}

// ── Theme segmented control ───────────────────────────────────────────────────
function ThemeSegmented({ theme, onToggle }) {
  const isDark = theme === 'dark';
  return (
    <div style={s.segmented} role="group" aria-label="Color theme">
      <button
        type="button"
        aria-pressed={isDark}
        onClick={() => !isDark && onToggle?.()}
        style={{
          ...s.segment,
          ...(isDark ? s.segmentActive : {}),
          color: isDark ? 'var(--fg-1)' : 'var(--fg-3)',
        }}
      >
        <IconMoon size={13} strokeWidth={1.8} />
        <span>Dark</span>
      </button>
      <button
        type="button"
        aria-pressed={!isDark}
        onClick={() => isDark && onToggle?.()}
        style={{
          ...s.segment,
          ...(!isDark ? s.segmentActive : {}),
          color: !isDark ? 'var(--fg-1)' : 'var(--fg-3)',
        }}
      >
        <IconSun size={13} strokeWidth={2} />
        <span>Light</span>
      </button>
    </div>
  );
}

// ── Slider row ────────────────────────────────────────────────────────────────
function SliderRow({ label, value, min, max, step, onChange, format }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={s.sliderRow}>
      <span style={s.sliderLabel}>{label}</span>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange?.(Number(e.target.value))}
        style={{
          ...s.slider,
          background: `linear-gradient(to right,
            var(--color-accent) ${pct}%,
            var(--color-surface-2) ${pct}%)`,
        }}
      />
      <span style={s.sliderValue}>{format ? format(value) : value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ControlPanel({
  isListening   = false,
  onToggleMic,
  status        = 'idle',

  voices        = [],
  selectedVoice = '',
  onVoiceChange,

  ttsEnabled    = true,
  onTtsToggle,
  ttsRate       = 1.0,
  onRateChange,
  ttsVolume     = 1.0,
  onVolumeChange,

  showText      = true,
  onTextToggle,

  theme         = 'dark',
  onThemeToggle,

  onAdminChange,
  isAdminMode   = false,
}) {
  // ── Devices ────────────────────────────────────────────────────────────────
  const [micDevices,      setMicDevices]      = useState([]);
  const [speakerDevices,  setSpeakerDevices]  = useState([]);
  const [selectedMic,     setSelectedMic]     = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');

  useEffect(() => {
    loadDevices().then(devices => {
      setMicDevices(    devices.filter(d => d.kind === 'audioinput'));
      setSpeakerDevices(devices.filter(d => d.kind === 'audiooutput'));
    });
    navigator.mediaDevices?.addEventListener('devicechange', () =>
      loadDevices().then(devices => {
        setMicDevices(    devices.filter(d => d.kind === 'audioinput'));
        setSpeakerDevices(devices.filter(d => d.kind === 'audiooutput'));
      })
    );
  }, []);

  const handleSpeakerChange = useCallback(async (deviceId) => {
    setSelectedSpeaker(deviceId);
    if (!deviceId) return;
    const audioEls = document.querySelectorAll('audio');
    for (const el of audioEls) {
      if (typeof el.setSinkId === 'function') await el.setSinkId(deviceId).catch(() => {});
    }
  }, []);

  // ── Admin section ──────────────────────────────────────────────────────────
  const [adminExpanded,  setAdminExpanded]  = useState(false);
  const [adminPass,      setAdminPass]      = useState('');
  const [adminError,     setAdminError]     = useState('');

  const handleAdminLogin = useCallback(() => {
    if (adminPass === 'admin1234') {
      setAdminMode(true);
      setAdminPass('');
      setAdminError('');
      onAdminChange?.(true);
    } else {
      setAdminError('Noto\'g\'ri parol');
    }
  }, [adminPass, onAdminChange]);

  const handleAdminLogout = useCallback(() => {
    setAdminMode(false);
    onAdminChange?.(false);
  }, [onAdminChange]);

  const handleResetUsage = useCallback(() => {
    resetUsage();
    onAdminChange?.(true);
  }, [onAdminChange]);

  // ── API settings ───────────────────────────────────────────────────────────
  const [activeKey,      setActiveKey]      = useState(1);
  const [selectedModel,  setSelectedModel]  = useState('gemini-2.5-flash');
  const [switchingKey,   setSwitchingKey]   = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/api/key-status`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
      .then(r => r.json())
      .then(data => {
        setActiveKey(data.activeKey ?? 1);
        setSelectedModel(data.currentModel ?? 'gemini-2.5-flash');
      })
      .catch(() => {});
  }, []);

  const handleKeySwitch = useCallback(async (keyNum) => {
    if (keyNum === activeKey || switchingKey) return;
    setSwitchingKey(true);
    try {
      const res = await fetch(`${BASE_URL}/api/switch-key`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body:    JSON.stringify({ targetKey: keyNum }),
      });
      const data = await res.json();
      setActiveKey(data.activeKey);
    } catch {}
    setSwitchingKey(false);
  }, [activeKey, switchingKey]);

  const handleModelChange = useCallback(async (newModel) => {
    if (newModel === selectedModel || settingsLoading) return;
    setSettingsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/set-model`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body:    JSON.stringify({ model: newModel }),
      });
      const data = await res.json();
      setSelectedModel(data.model ?? newModel);
    } catch {}
    setSettingsLoading(false);
  }, [selectedModel, settingsLoading]);

  const statusText = {
    listening:  'Listening…',
    processing: 'Translating…',
    error:      'Error occurred',
    idle:       'Ready',
  }[status] ?? 'Ready';

  const statusColor = {
    listening:  'var(--color-error)',
    processing: 'var(--color-accent)',
    error:      'var(--color-error)',
    idle:       'var(--color-success)',
  }[status];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>

      {/* ── 1. Appearance ──────────────────────────────────────────────── */}
      <section style={s.section}>
        <SectionHeader>Appearance</SectionHeader>
        <ThemeSegmented theme={theme} onToggle={onThemeToggle} />
      </section>

      <div style={s.divider} />

      {/* ── 2. Status ──────────────────────────────────────────────────── */}
      <section style={s.section}>
        <SectionHeader>Status</SectionHeader>
        <div style={s.micRow}>
          <MicButton status={status} size={48} onClick={onToggleMic} />
          <div style={s.micInfo}>
            <span style={{ ...s.micStatus, color: statusColor }}>{statusText}</span>
            <div
              className={`lt-wave${isListening ? '' : ' lt-wave--idle'}`}
              aria-hidden="true"
              style={{ height: 26 }}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="lt-wave__bar" style={{ height: `${9 + (i % 3) * 6}px` }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <div style={s.divider} />

      {/* ── 3. Devices ─────────────────────────────────────────────────── */}
      <section style={s.section}>
        <SectionHeader>Devices</SectionHeader>

        <SettingRow icon={IconMic} label="Microphone">
          <StyledSelect
            value={selectedMic}
            onChange={setSelectedMic}
            placeholder={micDevices.length ? 'Default' : 'No access'}
            options={micDevices.map(d => ({
              value: d.deviceId,
              label: d.label || `Mic ${d.deviceId.slice(0, 6)}`,
            }))}
          />
        </SettingRow>

        <SettingRow icon={IconHeadphones} label="Speaker">
          <StyledSelect
            value={selectedSpeaker}
            onChange={handleSpeakerChange}
            placeholder="Default"
            options={speakerDevices.map(d => ({
              value: d.deviceId,
              label: d.label || `Speaker ${d.deviceId.slice(0, 6)}`,
            }))}
          />
        </SettingRow>
      </section>

      <div style={s.divider} />

      {/* ── 4. Voice ───────────────────────────────────────────────────── */}
      <section style={s.section}>
        <SectionHeader>Voice</SectionHeader>

        {voices.length > 0 && (
          <SettingRow icon={IconVolume} label="Voice">
            <StyledSelect
              value={selectedVoice}
              onChange={v => onVoiceChange?.(v)}
              placeholder="Default"
              options={voices.map(v => ({ value: v.name, label: v.name }))}
            />
          </SettingRow>
        )}

        <SliderRow
          label="Speed"
          value={ttsRate}
          min={0.5} max={2.0} step={0.1}
          onChange={onRateChange}
          format={v => `${v.toFixed(1)}×`}
        />

        <SliderRow
          label="Volume"
          value={ttsVolume}
          min={0} max={1} step={0.05}
          onChange={onVolumeChange}
          format={v => `${Math.round(v * 100)}%`}
        />
      </section>

      <div style={s.divider} />

      {/* ── 5. AI Model ────────────────────────────────────────────────── */}
      <section style={s.section}>
        <SectionHeader>AI Model</SectionHeader>

        <div style={s.settingRow}>
          <span style={{ ...s.settingLabel, width: 56 }}>API Key</span>
          <div style={s.keyGroup}>
            {[1, 2].map(n => (
              <KeyButton
                key={n}
                n={n}
                active={activeKey === n}
                disabled={switchingKey}
                onClick={() => handleKeySwitch(n)}
              />
            ))}
          </div>
        </div>

        <div style={s.settingRow}>
          <span style={{ ...s.settingLabel, width: 56 }}>Model</span>
          <StyledSelect
            value={selectedModel}
            onChange={handleModelChange}
            placeholder=""
            disabled={settingsLoading}
            options={ALLOWED_MODELS}
          />
        </div>
      </section>

      <div style={s.divider} />

      {/* ── 6. Display ─────────────────────────────────────────────────── */}
      <section style={s.section}>
        <SectionHeader>Display</SectionHeader>

        <div style={s.displayRow}>
          <div style={s.displayItem}>
            <span style={s.displayLabel}>Voice (TTS)</span>
            <span style={s.displayDesc}>Read translations aloud</span>
          </div>
          <PillSwitch
            active={ttsEnabled}
            onToggle={() => onTtsToggle?.()}
            ariaLabel="Toggle text-to-speech"
          />
        </div>

        <div style={s.displayRow}>
          <div style={s.displayItem}>
            <span style={s.displayLabel}>Show Text</span>
            <span style={s.displayDesc}>Display transcript panels</span>
          </div>
          <PillSwitch
            active={showText}
            onToggle={() => onTextToggle?.()}
            ariaLabel="Toggle text display"
          />
        </div>
      </section>

      <div style={s.divider} />

      {/* ── 7. Admin ───────────────────────────────────────────────── */}
      <section style={s.section}>
        <button
          type="button"
          onClick={() => setAdminExpanded(p => !p)}
          style={{
            ...s.adminToggle,
            color: isAdminMode ? 'var(--color-accent)' : 'var(--fg-3)',
          }}
        >
          <span style={{ fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', fontSize: 'var(--fs-2xs)' }}>
            Admin
          </span>
          {isAdminMode && <span style={{ fontSize: 10, color: 'var(--color-success)' }}>● faol</span>}
          <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: 11 }}>
            {adminExpanded ? '▲' : '▼'}
          </span>
        </button>

        {adminExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', paddingTop: 'var(--sp-2)' }}>
            {isAdminMode ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-success)', flex: 1 }}>
                    ✓ Admin rejimi faol
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetUsage}
                  style={{ ...s.adminBtn, background: 'var(--color-surface-2)' }}
                >
                  Limitni tiklash
                </button>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  style={{ ...s.adminBtn, color: 'var(--color-error)', borderColor: 'rgba(239,68,68,0.3)' }}
                >
                  Admin chiqish
                </button>
              </>
            ) : (
              <>
                <input
                  type="password"
                  placeholder="Admin paroli"
                  value={adminPass}
                  onChange={e => { setAdminPass(e.target.value); setAdminError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                  style={s.adminInput}
                />
                {adminError && (
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-error)' }}>
                    {adminError}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleAdminLogin}
                  style={s.adminBtn}
                >
                  Kirish
                </button>
              </>
            )}
          </div>
        )}
      </section>

    </div>
  );
}

ControlPanel.propTypes = {
  isListening:    PropTypes.bool,
  onToggleMic:    PropTypes.func,
  status:         PropTypes.oneOf(['idle', 'listening', 'processing', 'error']),
  voices:         PropTypes.array,
  selectedVoice:  PropTypes.string,
  onVoiceChange:  PropTypes.func,
  ttsEnabled:     PropTypes.bool,
  onTtsToggle:    PropTypes.func,
  ttsRate:        PropTypes.number,
  onRateChange:   PropTypes.func,
  ttsVolume:      PropTypes.number,
  onVolumeChange: PropTypes.func,
  showText:       PropTypes.bool,
  onTextToggle:   PropTypes.func,
  theme:          PropTypes.oneOf(['dark', 'light']),
  onThemeToggle:  PropTypes.func,
  onAdminChange:  PropTypes.func,
  isAdminMode:    PropTypes.bool,
};

// ── Inline styles (CSS variable-driven) ──────────────────────────────────────
const s = {
  root: {
    display:       'flex',
    flexDirection: 'column',
    gap:           0,
    fontFamily:    'var(--font-sans)',
    color:         'var(--fg-1)',
  },

  section: {
    padding:       'var(--sp-5) 0 var(--sp-4)',
    display:       'flex',
    flexDirection: 'column',
    gap:           'var(--sp-3)',
  },

  sectionHead: {
    marginBottom: 'var(--sp-1)',
  },

  sectionTitle: {
    fontSize:      'var(--fs-2xs)',
    fontWeight:    700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    color:         'var(--fg-3)',
  },

  divider: {
    height:     1,
    background: 'var(--color-divider)',
  },

  // ── Status / mic
  micRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        'var(--sp-4)',
  },

  micInfo: {
    display:       'flex',
    flexDirection: 'column',
    gap:           'var(--sp-1)',
  },

  micStatus: {
    fontSize:      'var(--fs-sm)',
    fontWeight:    'var(--fw-semibold)',
    letterSpacing: '0.02em',
  },

  // ── Setting rows
  settingRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        'var(--sp-2)',
    minHeight:  38,
  },

  settingIcon: {
    width:      20,
    height:     20,
    display:    'grid',
    placeItems: 'center',
    color:      'var(--color-accent)',
    flexShrink: 0,
  },

  settingLabel: {
    fontSize:   'var(--fs-sm)',
    color:      'var(--fg-2)',
    flexShrink: 0,
    width:      80,
    fontWeight: 'var(--fw-medium)',
  },

  settingControl: {
    flex:    1,
    display: 'flex',
  },

  // ── Select
  select: {
    flex:               1,
    background:         'var(--color-surface-2)',
    border:             '1px solid var(--color-border)',
    borderRadius:       'var(--r-sm)',
    color:              'var(--fg-1)',
    fontSize:           'var(--fs-sm)',
    padding:            '7px var(--sp-3)',
    cursor:             'pointer',
    outline:            'none',
    appearance:         'none',
    WebkitAppearance:   'none',
    backgroundImage:    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237F77DD' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat:   'no-repeat',
    backgroundPosition: 'right 8px center',
    paddingRight:       28,
    transition:         'border-color 150ms',
  },

  // ── Slider
  sliderRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        'var(--sp-3)',
  },

  sliderLabel: {
    fontSize:   'var(--fs-sm)',
    color:      'var(--fg-3)',
    flexShrink: 0,
    width:      80,
    paddingLeft: 22,
    fontWeight:  'var(--fw-medium)',
  },

  slider: {
    flex:             1,
    height:           4,
    borderRadius:     'var(--r-pill)',
    outline:          'none',
    cursor:           'pointer',
    appearance:       'none',
    WebkitAppearance: 'none',
  },

  sliderValue: {
    fontFamily: 'var(--font-mono)',
    fontSize:   'var(--fs-xs)',
    color:      'var(--fg-2)',
    flexShrink: 0,
    minWidth:   36,
    textAlign:  'right',
  },

  // ── Key selector
  keyGroup: {
    display: 'flex',
    gap:     'var(--sp-2)',
    flex:    1,
  },

  keyBtn: {
    flex:           1,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            'var(--sp-1)',
    padding:        '6px var(--sp-3)',
    borderRadius:   'var(--r-sm)',
    border:         '1.5px solid',
    fontSize:       'var(--fs-sm)',
    fontFamily:     'var(--font-sans)',
    fontWeight:     600,
    transition:     'all 160ms var(--ease-out)',
    outline:        'none',
  },

  // ── Pill switch
  pillSwitch: {
    position:    'relative',
    width:       40,
    height:      22,
    borderRadius: 11,
    border:      '1.5px solid',
    cursor:      'pointer',
    transition:  'background 200ms var(--ease-out), border-color 200ms',
    flexShrink:  0,
    outline:     'none',
    padding:     0,
    display:     'flex',
    alignItems:  'center',
  },

  pillThumb: {
    position:     'absolute',
    top:          2,
    left:         2,
    width:        16,
    height:       16,
    borderRadius: '50%',
    transition:   'transform 200ms var(--ease-out), background 200ms',
    boxShadow:    '0 1px 3px rgba(0,0,0,0.25)',
    display:      'block',
  },

  // ── Theme segmented control
  segmented: {
    display:      'flex',
    background:   'var(--color-surface-2)',
    borderRadius: 'var(--r-sm)',
    padding:      3,
    gap:          2,
    border:       '1px solid var(--color-border)',
  },

  segment: {
    flex:           1,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            'var(--sp-2)',
    padding:        '7px var(--sp-3)',
    borderRadius:   'calc(var(--r-sm) - 3px)',
    border:         'none',
    background:     'transparent',
    fontSize:       'var(--fs-sm)',
    fontWeight:     'var(--fw-medium)',
    cursor:         'pointer',
    transition:     'all 160ms var(--ease-out)',
    fontFamily:     'var(--font-sans)',
    letterSpacing:  '0.01em',
  },

  segmentActive: {
    background: 'var(--color-card)',
    boxShadow:  'var(--shadow-sm)',
  },

  // ── Admin
  adminToggle: {
    display:    'flex',
    alignItems: 'center',
    gap:        'var(--sp-2)',
    width:      '100%',
    background: 'none',
    border:     'none',
    cursor:     'pointer',
    padding:    '4px 0',
    fontFamily: 'var(--font-sans)',
  },

  adminInput: {
    width:        '100%',
    background:   'var(--color-surface-2)',
    border:       '1px solid var(--color-border)',
    borderRadius: 'var(--r-sm)',
    color:        'var(--fg-1)',
    fontSize:     'var(--fs-sm)',
    padding:      '8px var(--sp-3)',
    outline:      'none',
    fontFamily:   'var(--font-sans)',
    boxSizing:    'border-box',
  },

  adminBtn: {
    width:        '100%',
    background:   'var(--color-accent)',
    border:       '1px solid transparent',
    borderRadius: 'var(--r-sm)',
    color:        '#fff',
    fontSize:     'var(--fs-sm)',
    fontWeight:   'var(--fw-semibold)',
    padding:      '8px var(--sp-3)',
    cursor:       'pointer',
    fontFamily:   'var(--font-sans)',
    transition:   'opacity 150ms',
  },

  // ── Display toggles
  displayRow: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    gap:            'var(--sp-3)',
    padding:        '4px 0',
  },

  displayItem: {
    display:       'flex',
    flexDirection: 'column',
    gap:           2,
    flex:          1,
  },

  displayLabel: {
    fontSize:   'var(--fs-sm)',
    fontWeight: 'var(--fw-semibold)',
    color:      'var(--fg-1)',
  },

  displayDesc: {
    fontSize: 'var(--fs-xs)',
    color:    'var(--fg-3)',
  },
};
