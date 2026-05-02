import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Renderer bundle for Electron: relative asset paths, readable source maps for debugging packaged builds.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist/renderer",
    target: "es2022",
    minify: mode === "production" ? "esbuild" : false,
    sourcemap: true,
    chunkSizeWarningLimit: 900,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"]
        }
      }
    }
  }
}));
