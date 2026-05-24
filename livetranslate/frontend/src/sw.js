import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// ── Precache: build assets (injected by vite-plugin-pwa at build time) ────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── Skip waiting — new SW activates immediately on refresh ────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Google Fonts — CacheFirst (fonts don't change) ───────────────────────────
registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries:     20,
        maxAgeSeconds:  365 * 24 * 60 * 60,  // 1 yil
      }),
    ],
  })
);

// ── /api/translate — NetworkFirst: online bo'lsa yangi, offline bo'lsa cache ──
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-translations-v1',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({
        maxEntries:     100,
        maxAgeSeconds:  24 * 60 * 60,   // 1 kun
      }),
    ],
  })
);

// ── ElevenLabs TTS audio — NetworkFirst ───────────────────────────────────────
registerRoute(
  ({ url }) => url.origin === 'https://api.elevenlabs.io',
  new NetworkFirst({
    cacheName: 'elevenlabs-audio-v1',
    networkTimeoutSeconds: 30,
    plugins: [
      new ExpirationPlugin({
        maxEntries:    30,
        maxAgeSeconds: 60 * 60,   // 1 soat
      }),
    ],
  })
);

// ── Static assets (SVG, fonts, images) — StaleWhileRevalidate ────────────────
registerRoute(
  ({ request }) =>
    request.destination === 'image' ||
    request.destination === 'font',
  new StaleWhileRevalidate({
    cacheName: 'static-assets-v1',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60 }),
    ],
  })
);

// ── Offline fallback ──────────────────────────────────────────────────────────
// Tarmoq yo'q va cache da ham yo'q bo'lsa — asosiy sahifani qaytaramiz
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/index.html')
      )
    );
  }
});
