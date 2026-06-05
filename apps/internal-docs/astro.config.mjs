import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    starlight({
      title: 'Aura - DevSpecs',
      customCss: ['./src/styles/custom.css'],
      head: [
        {
          tag: 'script',
          content: `
            (function() {
              if (document.getElementById('floating-pdf-btn')) return;
              const btn = document.createElement('button');
              btn.id = 'floating-pdf-btn';
              btn.className = 'floating-pdf-btn';
              btn.title = 'Exportar para PDF';
              btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg><span>PDF</span>';
              btn.onclick = function() { window.print(); };
              document.body.appendChild(btn);
            })();
          `
        }
      ],
      sidebar: [
        { slug: 'arquitetura-monorepo' },
        { slug: 'diretrizes-desenvolvimento' },
        { slug: 'infraestrutura' },
        { slug: 'seguranca-rotacao-tokens' },
        { slug: 'seguranca-auth' },
        { slug: 'mapeamento-banco-d1' },
        { slug: 'data-e-api' },
        { slug: 'engenharia/sse-reatividade' },
        { slug: 'engenharia/codigos-erro' },
        { slug: 'engenharia/geracao-pdf' },
        { slug: 'engenharia/arquitetura-pulso' },
        { slug: 'engenharia/arquitetura-traco' },
      ],
    }),
    react(),
  ],
});
