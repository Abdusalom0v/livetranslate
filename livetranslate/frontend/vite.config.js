import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // injectManifest: src/sw.js ni ishlatadi, __WB_MANIFEST ni ichiga inject qiladi
      strategies:   'injectManifest',
      srcDir:       'src',
      filename:     'sw.js',
      registerType: 'autoUpdate',

      // Precache: barcha build artifacts + statik fayllar
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,  // 5 MB
      },

      manifest: {
        name:             'LiveTranslate',
        short_name:       'LiveTranslate',
        description:      "Real-time tarjimon — ustoz gapiradi, talabalar o'z tilida o'qiydi",
        lang:             'uz',
        dir:              'ltr',
        theme_color:      '#5B4FD4',
        background_color: '#1E1E3F',
        display:          'standalone',
        orientation:      'portrait-primary',
        start_url:        '/',
        scope:            '/',
        categories:       ['education', 'utilities'],

        icons: [
          {
            src:     '/icon-192.svg',
            sizes:   '192x192',
            type:    'image/svg+xml',
            purpose: 'any',
          },
          {
            src:     '/icon-512.svg',
            sizes:   '512x512',
            type:    'image/svg+xml',
            purpose: 'any',
          },
          {
            src:     '/icon-maskable.svg',
            sizes:   '512x512',
            type:    'image/svg+xml',
            purpose: 'maskable',
          },
        ],

        shortcuts: [
          {
            name:        'Tarjimani boshlash',
            short_name:  'Boshlash',
            description: 'Mikrofon yoqib, tarjimani darhol boshlash',
            url:         '/?autostart=1',
            icons:       [{ src: '/icon-mic.svg', sizes: '96x96' }],
          },
        ],
      },

      // devOptions: dev rejimida ham SW ishlashi uchun
      devOptions: {
        enabled:           true,
        type:              'module',
        navigateFallback:  'index.html',
      },
    }),
  ],

  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
