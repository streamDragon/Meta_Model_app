/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' keeps the build deployable on GitHub Pages (relative asset paths).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    // Air-gapped builds must not request Google Fonts.
    {
      name: 'wisdom-offline-fonts',
      transformIndexHtml(html: string) {
        return mode === 'offline'
          ? html.replace(/\s*<link[^>]+href="https:\/\/fonts\.googleapis\.com[^>]*>/g, '')
                .replace(/\s*<link[^>]+href="https:\/\/fonts\.gstatic\.com[^>]*>/g, '')
          : html;
      },
    },
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
}));
