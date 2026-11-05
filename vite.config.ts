import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// `base: './'` makes every asset path relative. Together with hash-based
// routing (see src/router) the build works unchanged on a GitHub Pages
// project site (https://<user>.github.io/<repo>/), on a custom domain and
// when the dist folder is served from any sub directory.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
  },
});
