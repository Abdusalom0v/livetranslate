// Unicode range regexlar
const RE_CYRILLIC   = /[Ѐ-ӿ]/;      // Kirill: ру, ўз, қаз...
const RE_DEVANAGARI = /[ऀ-ॿ]/;      // Devanagari: hindi, nepal
const RE_LATIN      = /[a-zA-Z]/;

/**
 * Matn ichidagi harflar turiga qarab til kodini taxmin qiladi.
 * @param {string} text
 * @returns {'en' | 'hi' | 'uz'}
 */
export function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'en';
  const t = text.trim();
  if (!t) return 'en';

  if (RE_DEVANAGARI.test(t)) return 'hi';  // Devanagari → Hindi
  if (RE_CYRILLIC.test(t))   return 'uz';  // Kirill → O'zbek
  if (RE_LATIN.test(t))      return 'en';  // Lotin → Inglizcha

  return 'en'; // default
}

/**
 * Til kodini Web Speech API BCP-47 formatiga o'giradi.
 * @param {'en' | 'hi' | 'uz'} lang
 * @returns {string}
 */
export function getSpeechLang(lang) {
  const map = {
    en: 'en-US',
    hi: 'hi-IN',
    uz: 'uz-UZ',
  };
  return map[lang] ?? 'en-US';
}

/**
 * Til kodini o'zbekcha nomga o'giradi.
 * @param {'en' | 'hi' | 'uz'} lang
 * @returns {string}
 */
export function getLangName(lang) {
  const map = {
    en: 'Inglizcha',
    hi: 'Hindcha',
    uz: "O'zbekcha",
  };
  return map[lang] ?? lang;
}
