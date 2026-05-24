require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3001;

// ── API Keys ──────────────────────────────────────────────────────────────────
const KEY1 = process.env.GEMINI_API_KEY_1;
const KEY2 = process.env.GEMINI_API_KEY_2;

// ── Mutable Gemini state ──────────────────────────────────────────────────────
let activeKey    = 1;
let currentModel = 'gemini-2.5-flash';
let genAI        = null;
let model        = null;

const ALLOWED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

const SYSTEM_INSTRUCTION =
  "You are a professional real-time interpreter. Provide only the translation. No explanations, no commentary, no additional text.";

function buildModel() {
  const key = activeKey === 1 ? KEY1 : KEY2;
  if (!key) { genAI = null; model = null; return; }
  genAI = new GoogleGenerativeAI(key);
  model = genAI.getGenerativeModel({
    model: currentModel,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: { maxOutputTokens: 2000, temperature: 0.2 },
  });
  console.log(`[Gemini] Key ${activeKey} faol | model: ${currentModel}`);
}

function switchKey() {
  const next = activeKey === 1 ? 2 : 1;
  const targetKey = next === 1 ? KEY1 : KEY2;
  if (!targetKey) {
    console.warn(`[Gemini] Key ${next} mavjud emas — o'tilmadi`);
    return false;
  }
  activeKey = next;
  buildModel();
  console.log(`[Gemini] ⚡ Key ${activeKey} ga o'tildi (429 sababli)`);
  return true;
}

buildModel();

// ── ISO 639-1 → English name (Gemini prompt uchun) ────────────────────────────
const LANG_LABELS = {
  en: 'English',       hi: 'Hindi',         uz: 'Uzbek',         ru: 'Russian',
  es: 'Spanish',       zh: 'Chinese',       fr: 'French',        de: 'German',
  it: 'Italian',       nl: 'Dutch',         pt: 'Portuguese',    pl: 'Polish',
  ja: 'Japanese',      ko: 'Korean',        vi: 'Vietnamese',    id: 'Indonesian',
  th: 'Thai',          kk: 'Kazakh',        ky: 'Kyrgyz',        tg: 'Tajik',
  tk: 'Turkmen',       az: 'Azerbaijani',   ka: 'Georgian',      hy: 'Armenian',
  ar: 'Arabic',        fa: 'Persian',       he: 'Hebrew',        tr: 'Turkish',
  'ar-eg': 'Egyptian Arabic',               sw: 'Swahili',
  uk: 'Ukrainian',     be: 'Belarusian',    ro: 'Romanian',      hu: 'Hungarian',
  cs: 'Czech',         sv: 'Swedish',       da: 'Danish',        fi: 'Finnish',
  nb: 'Norwegian',     sk: 'Slovak',        bg: 'Bulgarian',     sr: 'Serbian',
  hr: 'Croatian',      sl: 'Slovenian',     et: 'Estonian',      lv: 'Latvian',
  lt: 'Lithuanian',    ms: 'Malay',         fil: 'Filipino',     bn: 'Bengali',
  ta: 'Tamil',         te: 'Telugu',        ur: 'Urdu',
};

// ── BCP-47 / short code → Microsoft Neural TTS voice ─────────────────────────
const EDGE_VOICES = {
  'uz': 'uz-UZ-MadinaNeural',     'uz-UZ': 'uz-UZ-MadinaNeural',
  'en': 'en-US-JennyNeural',      'en-US': 'en-US-JennyNeural',      'en-GB': 'en-GB-SoniaNeural',
  'hi': 'hi-IN-SwaraNeural',      'hi-IN': 'hi-IN-SwaraNeural',
  'ru': 'ru-RU-SvetlanaNeural',   'ru-RU': 'ru-RU-SvetlanaNeural',
  'fr': 'fr-FR-DeniseNeural',     'fr-FR': 'fr-FR-DeniseNeural',
  'de': 'de-DE-KatjaNeural',      'de-DE': 'de-DE-KatjaNeural',
  'es': 'es-ES-ElviraNeural',     'es-ES': 'es-ES-ElviraNeural',
  'zh': 'zh-CN-XiaoxiaoNeural',   'zh-CN': 'zh-CN-XiaoxiaoNeural',
  'it': 'it-IT-ElsaNeural',       'it-IT': 'it-IT-ElsaNeural',
  'nl': 'nl-NL-ColetteNeural',    'nl-NL': 'nl-NL-ColetteNeural',
  'pt': 'pt-PT-RaquelNeural',     'pt-PT': 'pt-PT-RaquelNeural',
  'pl': 'pl-PL-ZofiaNeural',      'pl-PL': 'pl-PL-ZofiaNeural',
  'ja': 'ja-JP-NanamiNeural',     'ja-JP': 'ja-JP-NanamiNeural',
  'ko': 'ko-KR-SunHiNeural',      'ko-KR': 'ko-KR-SunHiNeural',
  'vi': 'vi-VN-HoaiMyNeural',     'vi-VN': 'vi-VN-HoaiMyNeural',
  'id': 'id-ID-GadisNeural',      'id-ID': 'id-ID-GadisNeural',
  'th': 'th-TH-PremwadeeNeural',  'th-TH': 'th-TH-PremwadeeNeural',
  'kk': 'kk-KZ-AigulNeural',      'kk-KZ': 'kk-KZ-AigulNeural',
  'ky': 'ky-KG-NurbekNeural',     'ky-KG': 'ky-KG-NurbekNeural',
  'tg': 'ru-RU-SvetlanaNeural',   'tg-TJ': 'ru-RU-SvetlanaNeural',
  'tk': 'tk-TM-SaparmyratNeural', 'tk-TM': 'tk-TM-SaparmyratNeural',
  'az': 'az-AZ-BabekNeural',      'az-AZ': 'az-AZ-BabekNeural',
  'ka': 'ka-GE-EkaNeural',        'ka-GE': 'ka-GE-EkaNeural',
  'hy': 'hy-AM-AnahitNeural',     'hy-AM': 'hy-AM-AnahitNeural',
  'ar': 'ar-SA-ZariyahNeural',    'ar-SA': 'ar-SA-ZariyahNeural',    'ar-EG': 'ar-EG-SalmaNeural',
  'fa': 'fa-IR-DilaraNeural',     'fa-IR': 'fa-IR-DilaraNeural',
  'he': 'he-IL-HilaNeural',       'he-IL': 'he-IL-HilaNeural',
  'tr': 'tr-TR-EmelNeural',       'tr-TR': 'tr-TR-EmelNeural',
  'sw': 'sw-KE-ZuriNeural',       'sw-KE': 'sw-KE-ZuriNeural',
  'uk': 'uk-UA-PolinaNeural',     'uk-UA': 'uk-UA-PolinaNeural',
  'be': 'ru-RU-SvetlanaNeural',   'be-BY': 'ru-RU-SvetlanaNeural',
  'ro': 'ro-RO-AlinaNeural',      'ro-RO': 'ro-RO-AlinaNeural',
  'hu': 'hu-HU-NoemiNeural',      'hu-HU': 'hu-HU-NoemiNeural',
  'cs': 'cs-CZ-VlastaNeural',     'cs-CZ': 'cs-CZ-VlastaNeural',
  'sv': 'sv-SE-SofieNeural',      'sv-SE': 'sv-SE-SofieNeural',
  'da': 'da-DK-ChristelNeural',   'da-DK': 'da-DK-ChristelNeural',
  'fi': 'fi-FI-NooraNeural',      'fi-FI': 'fi-FI-NooraNeural',
  'nb': 'nb-NO-PernilleNeural',   'nb-NO': 'nb-NO-PernilleNeural',
  'sk': 'sk-SK-ViktoriaNeural',   'sk-SK': 'sk-SK-ViktoriaNeural',
  'bg': 'bg-BG-KalinaNeural',     'bg-BG': 'bg-BG-KalinaNeural',
  'sr': 'sr-RS-SophieNeural',     'sr-RS': 'sr-RS-SophieNeural',
  'hr': 'hr-HR-GabrijelaNeural',  'hr-HR': 'hr-HR-GabrijelaNeural',
  'sl': 'sl-SI-PetraNeural',      'sl-SI': 'sl-SI-PetraNeural',
  'et': 'et-EE-AnuNeural',        'et-EE': 'et-EE-AnuNeural',
  'lv': 'lv-LV-EveritaNeural',    'lv-LV': 'lv-LV-EveritaNeural',
  'lt': 'lt-LT-OnaNeural',        'lt-LT': 'lt-LT-OnaNeural',
  'ms': 'ms-MY-YasminNeural',     'ms-MY': 'ms-MY-YasminNeural',
  'fil': 'fil-PH-BlessicaNeural', 'fil-PH': 'fil-PH-BlessicaNeural',
  'bn': 'bn-BD-NabanitaNeural',   'bn-BD': 'bn-BD-NabanitaNeural',
  'ta': 'ta-IN-PallaviNeural',    'ta-IN': 'ta-IN-PallaviNeural',
  'te': 'te-IN-ShrutiNeural',     'te-IN': 'te-IN-ShrutiNeural',
  'ur': 'ur-PK-UzmaNeural',       'ur-PK': 'ur-PK-UzmaNeural',
};

const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

// ── Middleware ────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=60');
  next();
});

const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    // Localda istalgan port ruxsatli (5173, 5174, ...)
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
    if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return cb(null, true);
    if (/\.vercel\.app$/.test(origin)) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: "${origin}" ruxsatsiz`));
  },
}));
app.use(express.json());

// ── Rate limiter ──────────────────────────────────────────────────────────────
const translateLimiter = rateLimit({
  windowMs:        24 * 60 * 60 * 1000, // 24 soat
  max:             50,
  standardHeaders: true,
  legacyHeaders:   false,
  handler: (req, res) => {
    res.status(429).json({
      error:     'limit_exceeded',
      message:   'Kunlik limit tugadi. Ertaga qayta urinib ko\'ring.',
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  },
});

app.use('/api/translate', translateLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.status(200).json({
    status:         'ok',
    timestamp:      new Date().toISOString(),
    activeKey,
    key1Available:  Boolean(KEY1),
    key2Available:  Boolean(KEY2),
    currentModel,
  });
});

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
});

// ── Key & model management ────────────────────────────────────────────────────

app.get('/api/key-status', (req, res) => {
  res.json({
    activeKey,
    currentModel,
    key1: KEY1 ? 'set' : 'missing',
    key2: KEY2 ? 'set' : 'missing',
  });
});

app.post('/api/switch-key', (req, res) => {
  const { targetKey } = req.body ?? {};
  // targetKey berilsa — aniq shu keyga o'tish, bo'lmasa — toggle
  if (targetKey === 1 || targetKey === 2) {
    if (activeKey === targetKey) return res.json({ activeKey, switched: false });
  }
  const switched = switchKey();
  res.json({ activeKey, switched });
});

app.post('/api/set-model', (req, res) => {
  const { model: modelName } = req.body;
  if (!ALLOWED_MODELS.includes(modelName)) {
    return res.status(400).json({ error: "Invalid model name" });
  }
  currentModel = modelName;
  const activeApiKey = activeKey === 1 ? KEY1 : KEY2;
  genAI = new GoogleGenerativeAI(activeApiKey);
  model = genAI.getGenerativeModel({
    model: currentModel,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: { maxOutputTokens: 2000, temperature: 0.2 },
  });
  console.log('[MODEL] O\'zgartirildi:', currentModel);
  res.json({ success: true, model: currentModel });
});

// ── Translation (blocking) ────────────────────────────────────────────────────

app.post('/api/translate', async (req, res) => {
  const { text, sourceLang = 'en', targetLang = 'uz' } = req.body;

  if (!text || typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: '"text" maydoni kerak va bo\'sh bo\'lmasligi shart' });
  }
  if (!sourceLang || typeof sourceLang !== 'string') {
    return res.status(400).json({ error: '"sourceLang" kerak' });
  }
  if (!model) {
    return res.status(503).json({ error: 'Translation service unavailable: GEMINI_API_KEY not found' });
  }

  const sourceLabel = LANG_LABELS[sourceLang] ?? sourceLang;
  const targetLabel = LANG_LABELS[targetLang] ?? targetLang;
  const prompt = `Translate from ${sourceLabel} to ${targetLabel}. Output ONLY the translation:\n\n${text.trim()}`;

  async function doTranslate() {
    const start  = Date.now();
    const result = await model.generateContent(prompt);
    return { translation: result.response.text().trim(), latency: Date.now() - start };
  }

  try {
    const { translation, latency } = await doTranslate();
    res.status(200).json({ translation, latency });
  } catch (err) {
    console.error('[/api/translate] Gemini xatosi:', err.message);
    if (err.status === 429) {
      const switched = switchKey();
      if (switched) {
        try {
          const { translation, latency } = await doTranslate();
          return res.status(200).json({ translation, latency });
        } catch (retryErr) {
          console.error('[/api/translate] Retry xatosi:', retryErr.message);
          return res.status(429).json({ error: "Both keys are rate-limited. Please wait." });
        }
      }
      return res.status(429).json({ error: "Too many requests. Please wait." });
    }
    if (err.status === 400) return res.status(400).json({ error: 'Bad request: ' + err.message });
    res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
});

// ── Translation (SSE streaming) ───────────────────────────────────────────────

app.post('/api/translate/stream', async (req, res) => {
  const { text: inputText, sourceLang = 'en', targetLang = 'uz' } = req.body;

  if (!inputText?.trim()) return res.status(400).json({ error: '"text" kerak' });
  if (!model)             return res.status(503).json({ error: 'Gemini API not connected' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sourceLabel = LANG_LABELS[sourceLang] ?? sourceLang;
  const targetLabel = LANG_LABELS[targetLang] ?? targetLang;

  const prompt =
    `You are a professional real-time interpreter.\n` +
    `Rules:\n` +
    `- Write ONLY the translation, nothing else\n` +
    `- This sentence may be incomplete — the rest is coming, complete it logically\n` +
    `- Technical terms: target language + original in parentheses if helpful\n` +
    `- Keep it short, clear, and easy to read\n` +
    `- Language: ${sourceLabel} → ${targetLabel}\n` +
    `- Text (more coming): ${inputText.trim()}`;

  async function doStream(currentModel) {
    const result = await currentModel.generateContentStream(prompt);
    for await (const chunk of result.stream) {
      if (res.writableEnded) break;
      const chunkText = chunk.text();
      if (chunkText) res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
    }
  }

  try {
    await doStream(model);
    if (!res.writableEnded) { res.write('data: [DONE]\n\n'); res.end(); }
  } catch (err) {
    if (err.status === 429) {
      console.warn('[/api/translate/stream] 429 — key almashtirilmoqda...');
      const switched = switchKey();
      if (switched && !res.writableEnded) {
        try {
          await doStream(model);
          if (!res.writableEnded) { res.write('data: [DONE]\n\n'); res.end(); }
          return;
        } catch (retryErr) {
          console.error('[/api/translate/stream] Retry xatosi:', retryErr.message);
        }
      }
    } else {
      console.error('[/api/translate/stream]', err.message);
    }
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

// ── TTS — Microsoft Edge Neural (msedge-tts) ─────────────────────────────────

app.post('/api/tts', async (req, res) => {
  const { text, lang = 'uz' } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: '"text" maydoni kerak' });

  const voice = EDGE_VOICES[lang] || EDGE_VOICES[lang.split('-')[0]] || 'en-US-JennyNeural';
  console.log('[TTS] voice:', voice, '| lang:', lang, '| text:', text.slice(0, 40));

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {});
    const { audioStream } = tts.toStream(text.trim());

    const chunks = [];
    await new Promise((resolve, reject) => {
      audioStream.on('data', chunk => chunks.push(chunk));
      audioStream.on('end', resolve);
      audioStream.on('error', reject);
    });

    const buf = Buffer.concat(chunks);
    console.log('[TTS] Audio buffer:', buf.length, 'bytes');

    if (buf.length === 0) {
      console.error('[TTS] Bo\'sh audio buffer');
      return res.status(500).json({ error: 'TTS audio bo\'sh qaytdi' });
    }

    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Length', buf.length);
    res.set('Cache-Control', 'no-cache');
    res.send(buf);
  } catch (err) {
    console.error('[TTS ERROR]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `"${req.method} ${req.path}" route not found` });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`✅  LiveTranslate backend  →  http://localhost:${PORT}`);
  console.log(`    Key 1 : ${KEY1 ? '✔ topildi' : '✘ topilmadi'}`);
  console.log(`    Key 2 : ${KEY2 ? '✔ topildi' : '✘ topilmadi'}`);
  console.log(`    Model : ${currentModel}`);
});

server.timeout = 35_000;
