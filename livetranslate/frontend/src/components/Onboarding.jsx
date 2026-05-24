import { useState } from 'react';
import { IconMic, IconChevron, IconShield } from './Icons.jsx';
import { SUPPORTED_LANGS } from '../hooks/useTTS.js';

const ONBOARDING_LANGS = SUPPORTED_LANGS.filter(l =>
  ['en', 'hi', 'fr', 'de', 'ru', 'zh', 'ar', 'es'].includes(l.code)
);

function ProgressDots({ step, total = 3 }) {
  return (
    <div className="lt-onb__progress">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`lt-onb__dot ${i === step ? 'lt-onb__dot--active' : ''}`}></span>
      ))}
    </div>
  );
}

function Step1({ onNext }) {
  return (
    <div className="lt-onb__step">
      <div className="lt-onb__hero" aria-hidden="true">
        <IconMic size={56} strokeWidth={1.4} />
      </div>
      <h1 className="lt-onb__title">LiveTranslate</h1>
      <p className="lt-onb__sub">
        Real-time interpreter — for lectures, meetings, and conversations.
        Speak, and we translate instantly.
      </p>
      <button className="lt-btn" onClick={onNext}>
        Get started <IconChevron size={18} style={{ transform: 'rotate(-90deg)' }} />
      </button>
    </div>
  );
}

function Step2({ onNext }) {
  return (
    <div className="lt-onb__step">
      <div className="lt-onb__hero" style={{ background: 'var(--color-card)', boxShadow: 'none' }}>
        <IconShield size={56} strokeWidth={1.4} />
      </div>
      <h1 className="lt-onb__title">Microphone required</h1>
      <p className="lt-onb__sub">
        LiveTranslate needs microphone access to hear and translate your voice.
        Nothing is sent without your permission.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button className="lt-btn lt-btn--ghost" onClick={onNext}>Later</button>
        <button className="lt-btn" onClick={onNext}>
          <IconMic size={18} /> Grant access
        </button>
      </div>
    </div>
  );
}

function Step3({ onNext, source, target, setSource, setTarget }) {
  return (
    <div className="lt-onb__step" style={{ maxWidth: 640 }}>
      <h1 className="lt-onb__title" style={{ fontSize: 32 }}>Choose languages</h1>
      <p className="lt-onb__sub">Select your source and target languages.</p>
      <div className="lt-langpicker">
        <div className="lt-langpicker__col">
          <span className="lt-langpicker__label">Source language</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ONBOARDING_LANGS.slice(0, 4).map(l => (
              <button key={l.code}
                className={`lt-langtile ${source === l.code ? 'lt-langtile--active' : ''}`}
                onClick={() => setSource(l.code)}>
                <span className="lt-langtile__flag">{l.flag}</span>
                {l.name}
              </button>
            ))}
          </div>
        </div>
        <div className="lt-langpicker__col">
          <span className="lt-langpicker__label">Target language</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ONBOARDING_LANGS.slice(0, 4).map(l => (
              <button key={l.code}
                className={`lt-langtile ${target === l.code ? 'lt-langtile--active' : ''}`}
                onClick={() => setTarget(l.code)}>
                <span className="lt-langtile__flag">{l.flag}</span>
                {l.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button className="lt-btn" onClick={onNext}>Start</button>
    </div>
  );
}

export function Onboarding({ onComplete }) {
  const [step, setStep]     = useState(0);
  const [source, setSource] = useState('en');
  const [target, setTarget] = useState('uz');

  const next = () => {
    if (step >= 2) onComplete?.({ source, target });
    else setStep(step + 1);
  };

  return (
    <div className="lt-onb">
      <button className="lt-onb__skip" onClick={() => onComplete?.({ source, target })}>
        Skip
      </button>
      {step === 0 && <Step1 onNext={next} />}
      {step === 1 && <Step2 onNext={next} />}
      {step === 2 && <Step3 onNext={next}
                       source={source} target={target}
                       setSource={setSource} setTarget={setTarget} />}
      <ProgressDots step={step} total={3} />
    </div>
  );
}
