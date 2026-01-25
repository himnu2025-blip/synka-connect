import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Force single React instance for all dependencies
    dedupe: [
      "react",
      "react-dom",
      "@tanstack/react-query",
      "@radix-ui/react-toast",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-tabs",
    ],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@tanstack/react-query",
      "@radix-ui/react-toast",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
    ],
    // Force re-bundling to resolve duplicate React
    force: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-tooltip",
          ],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
    minify: "esbuild",
    sourcemap: false,
  },
}));
