import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5174,
    allowedHosts: true,
    proxy: {
      "/api": "http://localhost:8010",
      "/health": "http://localhost:8010",
      "/docs": "http://localhost:8010",
      "/openapi.json": "http://localhost:8010",
    },
  },
});
