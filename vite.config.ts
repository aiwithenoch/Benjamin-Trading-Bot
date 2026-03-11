import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      'process.env.DERIV_API_TOKEN': JSON.stringify(env.DERIV_API_TOKEN || 'd2XG7nqyVOKFfam'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      host: true,
      proxy: {
        '/api/claude': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/claude/, ''),
          headers: {
            'anthropic-version': '2023-06-01',
            'x-api-key': env.VITE_ANTHROPIC_API_KEY || '',
          },
        },
        '/api/news-proxy': {
          target: 'https://api.rss2json.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/news-proxy/, ''),
        },
        '/api/news': {
          target: 'https://benjamin-trading-bot-jbdl.vercel.app',
          changeOrigin: true,
        },
      },
    },
  };
});
