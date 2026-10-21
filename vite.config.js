import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // Build-Zeitpunkt fest ins Bundle einsetzen. Die App zeigt ihn neben dem
  // Datenstand an — damit ist am Gerät ablesbar, ob wirklich der neueste
  // Build ausgeliefert wird (dist/ ist gitignored, `git pull` allein genügt nicht).
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Pharos — Werkzeuge für den Einsatz",
        short_name: "Pharos",
        description: "Wirkstoff-Lexikon, SAA-Medigabe und SINNHAFT-Übergabe-Trainer für Rettungsfachpersonal.",
        lang: "de",
        start_url: "/",
        display: "standalone",
        background_color: "#050816",
        theme_color: "#050816",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,webmanifest}"],
        // Nur Latin-Fonts vorab cachen; andere Subsets lädt der Browser bei Bedarf.
        globIgnores: ["**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2"],
        runtimeCaching: [
          {
            urlPattern: /\/tesseract\/.+\.traineddata$/,
            handler: "CacheFirst",
            options: { cacheName: "wirkstoff-ocr-models", expiration: { maxEntries: 4 } },
          },
          {
            urlPattern: /zxing.*\.wasm$/,
            handler: "CacheFirst",
            options: { cacheName: "wirkstoff-zxing" },
          },
        ],
      },
    }),
  ],
});
