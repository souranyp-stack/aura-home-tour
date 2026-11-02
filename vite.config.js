import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: { module: true, toplevel: true, compress: { passes: 3 }, format: { comments: /@license/ } },
    chunkSizeWarningLimit: 1200,
  },
});
