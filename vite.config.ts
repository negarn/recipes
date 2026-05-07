import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { recipePreferencesApi } from './server/recipePreferencesApi';

export default defineConfig(({ mode }) => {
  const recipeEnv = loadEnv(mode, process.cwd(), 'RECIPE_');

  Object.assign(process.env, recipeEnv);

  return {
    plugins: [tailwindcss(), react(), recipePreferencesApi()],
    build: {
      target: 'esnext'
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'esnext'
      }
    },
    server: {
      host: '127.0.0.1',
      port: 5173
    }
  };
});
