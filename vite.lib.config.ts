import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  build: {
    outDir: 'dist-lib',
    emptyOutDir: false,
    lib: { entry: resolve(__dirname, 'src/player.ts'), name: 'SecureStreamPlayer', formats: ['es', 'umd'], fileName: f => f === 'es' ? 'securestream.js' : 'securestream.umd.cjs', cssFileName: 'securestream' },
    rollupOptions: { output: { exports: 'named' } }
  }
});
