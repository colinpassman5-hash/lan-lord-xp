import { defineConfig } from 'vite';

// Relative base so the build works on GitHub Pages (https://<user>.github.io/lan-lord-xp/) and any static host.
export default defineConfig({
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 0 },
});
