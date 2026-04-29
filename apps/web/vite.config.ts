import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiProxyTarget = process.env.PRAIRIE_PREVIEW_API_TARGET ?? "http://localhost:3100";
const apiProxy = {
  "/api": {
    target: apiProxyTarget,
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/react") || id.includes("/node_modules/react-dom")) {
            return "react";
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
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
});
