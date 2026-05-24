# LiveTranslate

Real-vaqt inglizcha/hindcha → o'zbekcha tarjimon. Ustoz gapirganda brauzer tinglaydi, Gemini API orqali tarjima qiladi va kalonkadan o'zbekcha ovoz chiqaradi.

---

## Tezkor boshlash (bir buyruq)

### 1. Gemini API kalitini oling (bepul)

[Google AI Studio](https://aistudio.google.com/app/apikey) → "Get API key"

### 2. Muhit fayllarini tayyor qiling

```bash
# Barcha paketlarni o'rnatish
npm run setup

# .env faylni yaratish
cp backend/.env.example backend/.env
```

`backend/.env` faylini oching va kalitni kiriting:

```
GEMINI_API_KEY=AIzaSy...
PORT=3001
```

### 3. Ishga tushirish

```bash
npm run dev
```

Brauzerda `http://localhost:5173` ni oching.

`npm run dev` ishga tushganda avval `scripts/check-env.js` tekshiruvi o'tadi — `.env` yoki kalit yo'q bo'lsa konsol da ogohlantirish chiqadi.

---

## Qo'lda ishga tushirish (alohida terminallar)

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev        # nodemon bilan (avtomatik restart)
# yoki: node server.js

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

---

## Ishlatish

1. **Ustoz tili** ni tanlang (English yoki Hindi)
2. **Boshlash** tugmasini bosing
3. Ustoz gapirishni boshlaydi → matn paydo bo'ladi → tarjima ovoz bilan aytiladi
4. **To'xtatish** tugmasi bilan to'xtatiladi

---

## Ngrok orqali demo (lokal → internet)

```bash
# Backend portini (3001) ochish
ngrok http 3001
```

Ngrok URL'ni frontend muhit fayliga yozing:

```bash
# frontend/.env
VITE_BACKEND_URL=https://xxxx.ngrok-free.app
```

---

## Health check

```bash
curl http://localhost:3001/health
# → {"status":"ok","timestamp":"...","apiKeyLoaded":true}
```

---

## Loyiha strukturasi

```
livetranslate/
  scripts/
    check-env.js         ← ishga tushishdan oldin .env tekshiruvi
  backend/
    server.js            ← Express server, Gemini API chaqiruvi
    .env                 ← GEMINI_API_KEY (git ga tushmaydi)
    .env.example         ← namuna
    package.json
  frontend/
    src/
      App.jsx            ← asosiy komponent (layout + barcha logika)
      hooks/
        useSpeechRecognition.js  ← Web Speech API wrapper
        useTranslation.js        ← Gemini tarjima + retry/backoff
        useTTS.js                ← ElevenLabs + speechSynthesis TTS
      components/
        Toast.jsx          ← bildirishnoma tizimi
        ErrorBoundary.jsx  ← React xato chegara
        PermissionModal.jsx ← mikrofon ruxsat modali
        MicButton.jsx
        TranscriptPanel.jsx
        ControlPanel.jsx
        AnimatedBackground.jsx
    public/
      icon-192.svg
      icon-512.svg
      icon-maskable.svg  ← PWA ikonalari
    index.html
    vite.config.js       ← PWA sozlamalari + proxy
    package.json
  package.json           ← root: concurrently, npm run dev
  README.md
```

---

## Texnologiyalar

| Vazifa | Texnologiya | Narx |
|--------|-------------|------|
| Ovoz → Matn | Web Speech API (Chrome) | Bepul |
| Tarjima | Gemini 2.5 Flash | Bepul (1.5M token/oy) |
| Matn → Ovoz | ElevenLabs / speechSynthesis | Bepul tier |
| Frontend | React 18 + Vite + PWA | Bepul |
| Backend | Node.js + Express | Bepul |
| Demo internet | ngrok | Bepul tier |

---

## Talablar

- **Node.js** v18+
- **Google Chrome** yoki Microsoft Edge (Web Speech API kerak)
- **HTTPS** yoki `localhost` (mikrofon ruxsati uchun)
