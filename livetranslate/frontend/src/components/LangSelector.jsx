import styles from './LangSelector.module.css';

const LANGS = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'hi', label: '🇮🇳 Hindi' },
  { code: 'uz', label: '🇺🇿 Uzbek' },
];

export function LangSelector({ value, onChange, disabled }) {
  return (
    <div className={styles.wrapper}>
      <span className={styles.hint}>Ustoz tili:</span>
      <div className={styles.group}>
        {LANGS.map((l) => (
          <button
            key={l.code}
            className={`${styles.btn} ${value === l.code ? styles.active : ''}`}
            onClick={() => onChange(l.code)}
            disabled={disabled}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
