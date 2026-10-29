import { defineConfig } from 'vite';

export default defineConfig({
  define: { __BUILD__: JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA || 'dev').slice(0, 7)) },
  build: { outDir: 'dist', assetsInlineLimit: 0 },
});
