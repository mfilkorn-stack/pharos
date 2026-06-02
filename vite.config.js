import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["manifest.webmanifest"],
      manifest: {
        name: "Pharos — Werkzeuge für den Einsatz",
        short_name: "Pharos",
        description: "Wirkstoff-Lexikon und SINNHAFT-Übergabe-Trainer für Rettungsfachpersonal.",
        start_url: "/",
        display: "standalone",
        background_color: "#050816",
        theme_color: "#050816",
        icons: [],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,webmanifest}"],
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
