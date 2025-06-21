import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    return {
      base: '/llm-workflow/',
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './'),
        }
      },
      plugins: [
        VitePWA({
          registerType: 'autoUpdate',
          manifest: {
            name: "LLM Workflow",
            short_name: "LLMWorkflow",
            description: "A workflow engine for LLM applications.",
            start_url: "/llm-workflow/",
            display: "standalone",
            background_color: "#ffffff",
            theme_color: "#1976d2",
            icons: [
              {
                src: 'favicon_s_.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'favicon_l_.png',
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          }
        })
      ]
    };
});
