import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { annotationsApi } from './src/server/annotations-api.ts';

const publicMode = process.env.VITE_PUBLIC_MODE === '1';

// The governance facade reads __PUBLIC_MODE__, so the read/write fetch code is
// dead-code-eliminated from public builds. No alias needed: the local API
// middleware is simply not registered when publicMode is true.
function publicExclusions(): Plugin {
  return { name: 'public-exclusions-marker' };
}

export default defineConfig({
  plugins: [react(), ...(publicMode ? [] : [annotationsApi()]), publicExclusions()],
  build: {
    outDir: publicMode ? 'dist-public' : 'dist',
    sourcemap: false,
  },
  define: {
    __PUBLIC_MODE__: JSON.stringify(publicMode),
  },
});
