import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: 'Aura - Central de Ajuda',
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        { slug: 'primeiros-passos' },
        { slug: 'agenda-integrada' },
        { slug: 'prontuario-digital' },
      ],
    }),
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
});
