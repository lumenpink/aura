import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envDir: '../../',
  server: {
    port: 12401,
    strictPort: true,
    allowedHosts: true,
  },
});
