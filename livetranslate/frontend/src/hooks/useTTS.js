import { useState, useRef, useCallback, useEffect } from 'react';
import { apiFetch } from '../utils/api.js';

// ── Qo'llab-quvvatlanadigan tillar (53 ta) ────────────────────────────────────
export const SUPPORTED_LANGS = [
  { code: 'en',    bcp47: 'en-US',    flag: '🇬🇧', name: 'English',             nativeName: 'English'         },
  { code: 'uz',    bcp47: 'uz-UZ',    flag: '🇺🇿', name: 'Uzbek',               nativeName: "O'zbekcha"       },
  { code: 'es',    bcp47: 'es-ES',    flag: '🇪🇸', name: 'Spanish',             nativeName: 'Español'         },
  { code: 'zh',    bcp47: 'zh-CN',    flag: '🇨🇳', name: 'Chinese',             nativeName: '中文'             },
  { code: 'hi',    bcp47: 'hi-IN',    flag: '🇮🇳', name: 'Hindi',               nativeName: 'हिन्दी'           },
  { code: 'fr',    bcp47: 'fr-FR',    flag: '🇫🇷', name: 'French',              nativeName: 'Français'        },
  { code: 'de',    bcp47: 'de-DE',    flag: '🇩🇪', name: 'German',              nativeName: 'Deutsch'         },
  { code: 'it',    bcp47: 'it-IT',    flag: '🇮🇹', name: 'Italian',             nativeName: 'Italiano'        },
  { code: 'nl',    bcp47: 'nl-NL',    flag: '🇳🇱', name: 'Dutch',               nativeName: 'Nederlands'      },
  { code: 'pt',    bcp47: 'pt-PT',    flag: '🇵🇹', name: 'Portuguese',          nativeName: 'Português'       },
  { code: 'pl',    bcp47: 'pl-PL',    flag: '🇵🇱', name: 'Polish',              nativeName: 'Polski'          },
  { code: 'ja',    bcp47: 'ja-JP',    flag: '🇯🇵', name: 'Japanese',            nativeName: '日本語'           },
  { code: 'ko',    bcp47: 'ko-KR',    flag: '🇰🇷', name: 'Korean',              nativeName: '한국어'           },
  { code: 'vi',    bcp47: 'vi-VN',    flag: '🇻🇳', name: 'Vietnamese',          nativeName: 'Tiếng Việt'      },
  { code: 'id',    bcp47: 'id-ID',    flag: '🇮🇩', name: 'Indonesian',          nativeName: 'Bahasa Indonesia'},
  { code: 'th',    bcp47: 'th-TH',    flag: '🇹🇭', name: 'Thai',                nativeName: 'ภาษาไทย'         },
  { code: 'kk',    bcp47: 'kk-KZ',    flag: '🇰🇿', name: 'Kazakh',              nativeName: 'Қазақша'         },
  { code: 'ky',    bcp47: 'ky-KG',    flag: '🇰🇬', name: 'Kyrgyz',              nativeName: 'Кыргызча'        },
  { code: 'tg',    bcp47: 'tg-TJ',    flag: '🇹🇯', name: 'Tajik',               nativeName: 'Тоҷикӣ'          },
  { code: 'tk',    bcp47: 'tk-TM',    flag: '🇹🇲', name: 'Turkmen',             nativeName: 'Türkmençe'       },
  { code: 'az',    bcp47: 'az-AZ',    flag: '🇦🇿', name: 'Azerbaijani',         nativeName: 'Azərbaycanca'    },
  { code: 'ka',    bcp47: 'ka-GE',    flag: '🇬🇪', name: 'Georgian',            nativeName: 'ქართული'         },
  { code: 'hy',    bcp47: 'hy-AM',    flag: '🇦🇲', name: 'Armenian',            nativeName: 'Հայerēn'         },
  { code: 'ar',    bcp47: 'ar-SA',    flag: '🇸🇦', name: 'Arabic',              nativeName: 'العربية'         },
  { code: 'fa',    bcp47: 'fa-IR',    flag: '🇮🇷', name: 'Persian',             nativeName: 'فارسی'           },
  { code: 'he',    bcp47: 'he-IL',    flag: '🇮🇱', name: 'Hebrew',              nativeName: 'עברית'           },
  { code: 'tr',    bcp47: 'tr-TR',    flag: '🇹🇷', name: 'Turkish',             nativeName: 'Türkçe'          },
  { code: 'ar-eg', bcp47: 'ar-EG',    flag: '🇪🇬', name: 'Egyptian Arabic',     nativeName: 'مصري'            },
  { code: 'sw',    bcp47: 'sw-KE',    flag: '🇰🇪', name: 'Swahili',             nativeName: 'Kiswahili'       },
  { code: 'ru',    bcp47: 'ru-RU',    flag: '🇷🇺', name: 'Russian',             nativeName: 'Русский'         },
  { code: 'uk',    bcp47: 'uk-UA',    flag: '🇺🇦', name: 'Ukrainian',           nativeName: 'Українська'      },
  { code: 'be',    bcp47: 'be-BY',    flag: '🇧🇾', name: 'Belarusian',          nativeName: 'Беларуская'      },
  { code: 'ro',    bcp47: 'ro-RO',    flag: '🇷🇴', name: 'Romanian',            nativeName: 'Română'          },
  { code: 'hu',    bcp47: 'hu-HU',    flag: '🇭🇺', name: 'Hungarian',           nativeName: 'Magyar'          },
  { code: 'cs',    bcp47: 'cs-CZ',    flag: '🇨🇿', name: 'Czech',               nativeName: 'Čeština'         },
  { code: 'sv',    bcp47: 'sv-SE',    flag: '🇸🇪', name: 'Swedish',             nativeName: 'Svenska'         },
  { code: 'da',    bcp47: 'da-DK',    flag: '🇩🇰', name: 'Danish',              nativeName: 'Dansk'           },
  { code: 'fi',    bcp47: 'fi-FI',    flag: '🇫🇮', name: 'Finnish',             nativeName: 'Suomi'           },
  { code: 'nb',    bcp47: 'nb-NO',    flag: '🇳🇴', name: 'Norwegian',           nativeName: 'Norsk'           },
  { code: 'sk',    bcp47: 'sk-SK',    flag: '🇸🇰', name: 'Slovak',              nativeName: 'Slovenčina'      },
  { code: 'bg',    bcp47: 'bg-BG',    flag: '🇧🇬', name: 'Bulgarian',           nativeName: 'Български'       },
  { code: 'sr',    bcp47: 'sr-RS',    flag: '🇷🇸', name: 'Serbian',             nativeName: 'Српски'          },
  { code: 'hr',    bcp47: 'hr-HR',    flag: '🇭🇷', name: 'Croatian',            nativeName: 'Hrvatski'        },
  { code: 'sl',    bcp47: 'sl-SI',    flag: '🇸🇮', name: 'Slovenian',           nativeName: 'Slovenščina'     },
  { code: 'et',    bcp47: 'et-EE',    flag: '🇪🇪', name: 'Estonian',            nativeName: 'Eesti'           },
  { code: 'lv',    bcp47: 'lv-LV',    flag: '🇱🇻', name: 'Latvian',             nativeName: 'Latviešu'        },
  { code: 'lt',    bcp47: 'lt-LT',    flag: '🇱🇹', name: 'Lithuanian',          nativeName: 'Lietuvių'        },
  { code: 'ms',    bcp47: 'ms-MY',    flag: '🇲🇾', name: 'Malay',               nativeName: 'Bahasa Melayu'   },
  { code: 'fil',   bcp47: 'fil-PH',   flag: '🇵🇭', name: 'Filipino',            nativeName: 'Filipino'        },
  { code: 'bn',    bcp47: 'bn-BD',    flag: '🇧🇩', name: 'Bengali',             nativeName: 'বাংলা'           },
  { code: 'ta',    bcp47: 'ta-IN',    flag: '🇮🇳', name: 'Tamil',               nativeName: 'தமிழ்'           },
  { code: 'te',    bcp47: 'te-IN',    flag: '🇮🇳', name: 'Telugu',              nativeName: 'తెలుగు'          },
  { code: 'ur',    bcp47: 'ur-PK',    flag: '🇵🇰', name: 'Urdu',                nativeName: 'اردو'            },
];

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const ttsEnabledRef = useRef(true);
  useEffect(() => { ttsEnabledRef.current = ttsEnabled; }, [ttsEnabled]);

  const audioCtxRef = useRef(null);
  const sourceRef   = useRef(null);
  const fetchCtrlRef = useRef(null);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const stop = useCallback(() => {
    if (fetchCtrlRef.current) { fetchCtrlRef.current.abort(); fetchCtrlRef.current = null; }
    if (sourceRef.current) {
      try { sourceRef.current.stop(); }       catch {}
      try { sourceRef.current.disconnect(); } catch {}
      sourceRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text, lang = 'uz-UZ') => {
    if (!text?.trim() || !ttsEnabledRef.current) return;
    const trimmed = text.trim();

    // Oldingi audio va fetch ni bekor qil
    if (fetchCtrlRef.current) { fetchCtrlRef.current.abort(); fetchCtrlRef.current = null; }
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current = null;
    }

    const ctrl = new AbortController();
    fetchCtrlRef.current = ctrl;
    setIsSpeaking(true);

    try {
      console.log('[TTS] So\'rov:', trimmed.slice(0, 30), '| lang:', lang);

      const res = await apiFetch('/api/tts', { text: trimmed, lang }, ctrl.signal);

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`TTS server error ${res.status}: ${errBody}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      console.log('[TTS] Audio keldi:', arrayBuffer.byteLength, 'bytes');

      if (arrayBuffer.byteLength < 100) {
        console.error('[TTS] Audio juda kichik, o\'tkaziladi!');
        return;
      }

      if (ctrl.signal.aborted) return;

      const ctx = getCtx();
      if (ctx.state === 'suspended') await ctx.resume();

      const decoded = await ctx.decodeAudioData(arrayBuffer);
      if (ctrl.signal.aborted) return;

      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      sourceRef.current = source;

      await new Promise(resolve => {
        source.onended = () => {
          if (sourceRef.current === source) sourceRef.current = null;
          resolve();
        };
        source.start(0);
      });

      console.log('[TTS] Ijro tugadi');

    } catch (err) {
      if (err.name !== 'AbortError') console.error('[TTS] Xato:', err);
    } finally {
      if (fetchCtrlRef.current === ctrl) fetchCtrlRef.current = null;
      if (!sourceRef.current) setIsSpeaking(false);
    }
  }, [getCtx]);

  // Brauzer consolida qo'lda sinash uchun
  useEffect(() => {
    window.testTTS = () => speak('Salom, bu sinov', 'uz-UZ');
    return () => { delete window.testTTS; };
  }, [speak]);

  useEffect(() => () => stop(), [stop]);

  return {
    speak,
    stop,
    isSpeaking,
    ttsEnabled,
    setTtsEnabled,
    ttsRate: 1.0,
    ttsVolume: 1.0,
    availableVoices: [],
    selectedVoiceName: '',
  };
}
