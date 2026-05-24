#!/usr/bin/env node
/**
 * check-env.js
 * Loyiha ishga tushishidan oldin zaruriy muhit o'zgaruvchilarini tekshiradi.
 * Ogohlantirish beradi, lekin jarayonni to'xtatmaydi (exit 0).
 */

const fs   = require('fs');
const path = require('path');

const root    = process.cwd();
const envPath = path.join(root, 'backend', '.env');
const exPath  = path.join(root, 'backend', '.env.example');

// ANSI ranglar
const R = '\x1b[0m';      // reset
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN  = '\x1b[32m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

const sep = DIM + '─'.repeat(54) + R;

console.log('\n' + sep);
console.log(BOLD + CYAN + '  LiveTranslate — muhit tekshiruvi' + R);
console.log(sep);

let ok = true;

// ── 1. backend/.env borligini tekshir ────────────────────────────────────────
if (!fs.existsSync(envPath)) {
  ok = false;
  console.log(RED + BOLD + '\n  ✘  backend/.env topilmadi!' + R);
  console.log(YELLOW + '\n     Quyidagi buyruqni bajaring:\n' + R);

  if (fs.existsSync(exPath)) {
    console.log(CYAN + '     cp backend/.env.example backend/.env' + R);
  } else {
    console.log(CYAN + '     echo GEMINI_API_KEY=your_key > backend/.env' + R);
  }

  console.log(YELLOW + '\n     Keyin GEMINI_API_KEY ni kiriting.' + R);
  console.log(YELLOW + '     Bepul kalit: https://aistudio.google.com/app/apikey\n' + R);

} else {
  // ── 2. GEMINI_API_KEY o'rnatilganligini tekshir ──────────────────────────
  const content = fs.readFileSync(envPath, 'utf8');
  const match   = content.match(/^GEMINI_API_KEY\s*=\s*(.+)$/m);
  const keyVal  = match?.[1]?.trim().replace(/^["']|["']$/g, '');
  const PLACEHOLDER = 'your_gemini_api_key_here';

  if (!keyVal || keyVal === PLACEHOLDER) {
    ok = false;
    console.log(RED + BOLD + '\n  ✘  GEMINI_API_KEY o\'rnatilmagan!' + R);
    console.log(YELLOW + '\n     backend/.env faylini oching:' + R);
    console.log(CYAN + '     GEMINI_API_KEY=AIzaSy...' + R);
    console.log(YELLOW + '\n     Bepul kalit: https://aistudio.google.com/app/apikey\n' + R);
  } else {
    const preview = keyVal.slice(0, 8) + '••••••••';
    console.log(GREEN + '  ✔  GEMINI_API_KEY topildi  ' + DIM + '(' + preview + ')' + R);
  }

  // ── 3. PORT ni qayd etamiz ───────────────────────────────────────────────
  const portMatch = content.match(/^PORT\s*=\s*(\d+)$/m);
  const port      = portMatch?.[1] ?? '3001';
  console.log(GREEN + '  ✔  Backend port  ' + DIM + '→ ' + port + R);
}

// ── Frontend .env tekshiruvi (ixtiyoriy) ──────────────────────────────────────
const feEnv = path.join(root, 'frontend', '.env');
if (fs.existsSync(feEnv)) {
  const feCnt  = fs.readFileSync(feEnv, 'utf8');
  const beUrl  = feCnt.match(/^VITE_BACKEND_URL\s*=\s*(.+)$/m)?.[1]?.trim();
  if (beUrl) {
    console.log(GREEN + '  ✔  VITE_BACKEND_URL  ' + DIM + '→ ' + beUrl + R);
  }
}

console.log('');
console.log(sep);

if (ok) {
  console.log(BOLD + GREEN + '  Barcha tekshiruvlar o\'tdi — serverlar ishga tushirilmoqda...' + R);
} else {
  console.log(BOLD + YELLOW + '  ⚠   Xatoliklar bor — serverlar baribir ishga tushadi,' + R);
  console.log(YELLOW + '      lekin tarjima API kalitsiz ishlamaydi.' + R);
}

console.log(sep + '\n');

// Har doim 0 bilan chiqamiz — predev hook jarayonni to'xtatmasin
process.exit(0);
