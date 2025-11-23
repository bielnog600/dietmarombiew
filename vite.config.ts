import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'safari-pinned-tab.svg'
      ],
      manifest: {
        name: 'DIETA',
        short_name: 'DIETA',
        description: 'Seu plano alimentar personalizado',
        theme_color: '#f8c045',
        background_color: '#171717',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        prefer_related_applications: false,
        categories: ['fitness', 'health', 'lifestyle'],
        permissions: ['notifications'],
        shortcuts: [
          {
            name: 'Minha Dieta',
            url: '/diet-plan',
            description: 'Ver meu plano alimentar'
          }
        ],
        icons: [
          {
            src: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WFlh1WFWGtO11jwoHGnd/pub/1eaqdsHJVJbwEvSURATP.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WFlh1WFWGtO11jwoHGnd/pub/1eaqdsHJVJbwEvSURATP.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WFlh1WFWGtO11jwoHGnd/pub/1eaqdsHJVJbwEvSURATP.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        sourcemap: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/dplvokmtrwiscxibiobp\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 10,
              backgroundSync: {
                name: 'supabase-sync',
                options: {
                  maxRetentionTime: 24 * 60 // Retry for 24 hours
                }
              }
            }
          },
          {
            urlPattern: /^https:\/\/storage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react']
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js']
        }
      }
    }
  }
});