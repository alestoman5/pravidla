import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              // SDK necháváme jako běžnou runtime závislost — electron-builder ho
              // zabalí z node_modules, takže se nemusí bundlovat do main procesu.
              external: ['electron', '@anthropic-ai/sdk'],
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
      },
    }),
  ],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 900,
  },
});
