import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');

export default defineConfig({
  site: env.SITE_URL || 'https://example.pages.dev',
});
