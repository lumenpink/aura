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
        { slug: 'mapeamento-banco-d1' },
        { slug: 'engenharia/sse-reatividade' },
      ],
    }),
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
});
