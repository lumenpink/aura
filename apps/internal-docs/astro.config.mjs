import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: 'Aura - DevSpecs',
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        { slug: 'arquitetura-monorepo' },
        { slug: 'seguranca-rotacao-tokens' },
        { slug: 'seguranca-auth' },
        { slug: 'mapeamento-banco-d1' },
        { slug: 'data-e-api' },
        { slug: 'engenharia/sse-reatividade' },
        { slug: 'engenharia/codigos-erro' },
      ],
    }),
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
});
