import { defineConfig } from 'vitest/config';
export default defineConfig({ base: '/SecureStream-Player/', test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] } });
