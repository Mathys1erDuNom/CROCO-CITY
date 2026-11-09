import { defineConfig } from 'vite';

export default defineConfig({
  preview: {
    // Autorise le domaine Railway à accéder au site
    allowedHosts: ['croco-city-production-d50e.up.railway.app'],
  },
});