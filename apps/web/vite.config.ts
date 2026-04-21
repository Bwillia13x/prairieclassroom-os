import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/react") || id.includes("/node_modules/react-dom")) {
            return "react";
          }
          if (id.includes("/apps/web/src/components/DataVisualizations")) {
            return "visualizations";
          }
          if (id.includes("/apps/web/src/panels/")) {
            return "panels";
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    // Allow Emergent preview hosts in dev. Safe: Vite dev server is a local
    // binary and this only affects the `npm run dev` experience.
    allowedHosts: [".preview.emergentagent.com", ".preview.emergentcf.cloud"],
    proxy: {
      "/api": {
        target: "http://localhost:3100",
        changeOrigin: true,
      },
    },
  },
});
