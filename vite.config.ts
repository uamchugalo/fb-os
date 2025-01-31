import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/project/', // nome do seu repositório
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
