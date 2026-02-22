import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "gdoc-logs",
        short_name: "gdoc-logs",
        description: "Google Docs をつぶやき日記として使う個人用アプリ",
        start_url: "/gdoc-logs/",
        scope: "/gdoc-logs/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        lang: "ja",
        icons: [
          {
            src: "/gdoc-logs/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/gdoc-logs/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/gdoc-logs/index.html",
        navigateFallbackDenylist: [/^\/gdoc-logs\/api\//],
      },
    }),
  ],
  base: "/gdoc-logs/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
