import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    inspectAttr(),
    react(),
    VitePWA({
      // Register only from AdminPage via virtual:pwa-register
      injectRegister: false,
      registerType: "autoUpdate",
      strategies: "generateSW",
      // Public site uses its own static manifest; admin injects admin.webmanifest at runtime
      manifest: false,
      includeAssets: ["icons/admin-192.png", "icons/admin-512.png", "icons/admin-apple-180.png"],
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackAllowlist: [/^\/admin/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkOnly",
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5000,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:8787',
      '/uploads': 'http://localhost:8787',
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
