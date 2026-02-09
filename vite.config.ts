import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    host: true, // or "0.0.0.0"
    allowedHosts: [
      "heartrenderingly-patellate-gerardo.ngrok-free.dev",
      ".ngrok-free.dev", // allow any ngrok-free.dev subdomain (optional but handy)
      "https://cricket-live-scorer-alpha.vercel.app/"
    ],
  },

  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: true },
      includeAssets: ["favicon.svg", "robots.txt"],
      manifest: {
        name: "Live Scorer",
        short_name: "LiveScorer",
        description: "Cricket scoring app for live matches.",
        theme_color: "#05070d",
        background_color: "#05070d",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/Cricket_icon.png", sizes: "192x192", type: "image/png" },
          { src: "/Cricket_icon.png", sizes: "512x512", type: "image/png" },
          { src: "/Cricket_icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,ico,txt,woff2}"],
      },
    }),
  ],
});
