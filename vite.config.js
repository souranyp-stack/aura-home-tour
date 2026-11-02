import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: { compress: { passes: 2 }, format: { comments: /@license/ } },
    chunkSizeWarningLimit: 1200,
  },
});
