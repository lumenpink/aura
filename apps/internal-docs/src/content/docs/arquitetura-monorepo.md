---
title: Arquitetura do Monorepo
description: Especificações e organização estrutural do monorepo Aura.
---

Este documento detalha a estrutura de workspaces e a distribuição de pacotes no monorepo do Projeto Aura.

## Visão Geral

O projeto adota uma estrutura baseada em NPM/Bun Workspaces dividida da seguinte forma:

- **`packages/shared`**: Biblioteca compartilhada de utilitários e validações baseadas em Zod.
- **`packages/ui`**: Biblioteca compartilhada de componentes visuais React + Tailwind.
- **`apps/fluxo-frontend`**: Aplicação cliente principal do Aura Fluxo em React (Vite).
- **`apps/fluxo-backend`**: Microsserviço operacional e de sincronização do Aura Fluxo (Hono).
- **`apps/traco-frontend`**: Aplicação de interface do Aura Traço em React (Vite).
- **`apps/traco-backend`**: Microsserviço de assinatura digital do Aura Traço (Hono).
- **`apps/pulso-frontend`**: Aplicação de interface do Aura Pulso em React (Vite).
- **`apps/pulso-backend`**: Microsserviço de prescrições do Aura Pulso (Hono).
- **`apps/internal-docs`**: Trilha de engenharia gerada via Starlight (Astro).
- **`apps/user-manual`**: Manual de operação do usuário final gerado via Starlight (Astro).

## Regras de Dependências

1. Nenhum aplicativo deve cruzar dependências diretamente de outros aplicativos; todo código compartilhado deve ser centralizado em `packages/shared` ou `packages/ui`.
2. A tipagem do back-end é exposta via RPC client no front-end para chamadas com segurança de tipos fim-a-fim.
