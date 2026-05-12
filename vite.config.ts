import { defineConfig } from "vite";
import type { Plugin, UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";

const isProdLikeBundle = (mode: string): boolean => mode !== "development";

function getAppVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync("package.json", "utf-8")) as { version: string };
    return pkg.version;
  } catch {
    return "0.0.0";
  }
}

// Renderer bundle for Electron: relative asset paths, readable source maps for debugging packaged builds.
export default defineConfig(async ({ mode }): Promise<UserConfig> => {
  const reportPlugin =
    mode === "report"
      ? (await import("rollup-plugin-visualizer")).visualizer({
          filename: "dist/renderer/stats.html",
          gzipSize: true,
          brotliSize: true,
          template: "treemap",
          open: false
        })
      : null;

  const reactPlugins = react();
  const plugins: Plugin[] = [...(Array.isArray(reactPlugins) ? reactPlugins : [reactPlugins])];
  if (reportPlugin) {
    plugins.push(...(Array.isArray(reportPlugin) ? reportPlugin : [reportPlugin]));
  }

  return {
    base: "./",
    define: {
      __APP_VERSION__: JSON.stringify(getAppVersion())
    },
    plugins,
    build: {
      outDir: "dist/renderer",
      target: "es2022",
      minify: isProdLikeBundle(mode) ? "esbuild" : false,
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
  };
});
